import Peer, { type DataConnection } from 'peerjs';
import { MAX_PLAYERS, PEER_ID_PREFIX } from '../config';
import type { RosterEntry } from '../types';
import {
  PROTOCOL_VERSION,
  MAX_MESSAGE_LENGTH,
  encodeMessage,
  normalizeRoomCode,
  parseClientMessage,
  parseHostMessage,
  randomRoomCode,
  sanitizeName,
  type ClientMessage,
  type HostMessage,
} from './Protocol';

const PEER_OPTIONS = {
  debug: 0,
  secure: true,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  },
} as const;

export interface NetworkCallbacks {
  onReady: (
    selfId: string,
    hostId: string,
    roster: RosterEntry[],
    roomCode: string,
    role: 'host' | 'client',
  ) => void;
  onRoster: (roster: RosterEntry[]) => void;
  onMessage: (message: HostMessage | ClientMessage, fromId: string) => void;
  onPeerJoined?: (peerId: string) => void;
  onPeerLeft?: (peerId: string) => void;
  onError?: (message: string, fatal: boolean) => void;
  onClosed?: (reason: string) => void;
}

function waitForPeerOpen(peer: Peer): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      peer.off('open', onOpen);
      peer.off('error', onError);
    };
    const onOpen = (id: string): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(id);
    };
    const onError = (error: { type?: string; message?: string }): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    peer.on('open', onOpen);
    peer.on('error', onError);
    window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error('El servicio de señalización no respondió.'));
    }, 18_000);
  });
}

function waitForConnection(connection: DataConnection): Promise<void> {
  return new Promise((resolve, reject) => {
    if (connection.open) {
      resolve();
      return;
    }
    let settled = false;
    const cleanup = (): void => {
      connection.off('open', onOpen);
      connection.off('error', onError);
    };
    const onOpen = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };
    const onError = (error: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    connection.on('open', onOpen);
    connection.on('error', onError);
    window.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error('La conexión P2P agotó el tiempo de espera.'));
    }, 22_000);
  });
}

function hostPeerId(code: string): string {
  return `${PEER_ID_PREFIX}${code.toLowerCase()}`;
}

function makeSelfEntry(id: string, name: string, color: number, isHost: boolean): RosterEntry {
  return { id, name, color, isHost };
}

export class PeerNetwork {
  private peer: Peer | null = null;
  private role: 'host' | 'client';
  private roomCode: string;
  private selfId = '';
  private hostId = '';
  private roster: RosterEntry[] = [];
  private readonly connections = new Map<string, DataConnection>();
  private readonly accepted = new Set<string>();
  private readonly pendingNames = new Map<string, string>();
  private readonly callbacks: NetworkCallbacks;
  private readonly selfName: string;
  private closed = false;
  private ready = false;

  private constructor(
    peer: Peer,
    role: 'host' | 'client',
    roomCode: string,
    selfName: string,
    callbacks: NetworkCallbacks,
  ) {
    this.peer = peer;
    this.role = role;
    this.roomCode = roomCode;
    this.selfName = selfName;
    this.callbacks = callbacks;
    this.selfId = peer.id;
    this.hostId = role === 'host' ? peer.id : hostPeerId(roomCode);
    this.bindPeer();
  }

  static async host(nameValue: string, callbacks: NetworkCallbacks): Promise<PeerNetwork> {
    const name = sanitizeName(nameValue);
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomRoomCode();
      const peer = new Peer(hostPeerId(code), PEER_OPTIONS);
      try {
        await waitForPeerOpen(peer);
        const network = new PeerNetwork(peer, 'host', code, name, callbacks);
        network.roster = [makeSelfEntry(network.selfId, name, 0, true)];
        network.ready = true;
        callbacks.onReady(network.selfId, network.hostId, [...network.roster], code, 'host');
        return network;
      } catch (error) {
        lastError = error;
        peer.destroy();
        const type = (error as { type?: string }).type;
        if (type === 'unavailable-id') {
          continue;
        }
        throw new Error(
          (error as { message?: string }).message ||
            'No se pudo crear la sala P2P. Comprueba tu conexión.',
        );
      }
    }
    throw new Error(
      lastError instanceof Error
        ? `No se pudo reservar un código de sala: ${lastError.message}`
        : 'No se pudo reservar un código de sala.',
    );
  }

  static async join(
    nameValue: string,
    codeValue: string,
    callbacks: NetworkCallbacks,
  ): Promise<PeerNetwork> {
    const name = sanitizeName(nameValue);
    const code = normalizeRoomCode(codeValue);
    if (code.length !== 6) {
      throw new Error('El código corporativo debe tener 6 caracteres.');
    }
    const peer = new Peer(PEER_OPTIONS);
    let localId = '';
    try {
      localId = await waitForPeerOpen(peer);
    } catch (error) {
      peer.destroy();
      throw new Error(
        (error as { message?: string }).message ||
          'El servicio de señalización no respondió.',
      );
    }
    const network = new PeerNetwork(peer, 'client', code, name, callbacks);
    network.selfId = localId;
    network.hostId = hostPeerId(code);
    try {
      await network.connectToHost(name);
      return network;
    } catch (error) {
      network.destroyPeer();
      throw error;
    }
  }

  private bindPeer(): void {
    if (!this.peer) {
      return;
    }
    this.peer.on('connection', (connection) => {
      if (this.role === 'host') {
        this.acceptConnection(connection);
      }
    });
    this.peer.on('error', (error) => {
      if (this.closed) {
        return;
      }
      const message = error.message || error.type || 'Error de red P2P';
      const fatal =
        error.type === 'peer-unavailable' ||
        error.type === 'unavailable-id' ||
        error.type === 'network' ||
        error.type === 'server-error';
      this.callbacks.onError?.(message, fatal);
      if (fatal && (!this.ready || this.role === 'client')) {
        this.close(message);
      }
    });
    this.peer.on('disconnected', () => {
      if (this.closed) {
        return;
      }
      this.callbacks.onError?.(
        'Se perdió la señalización PeerJS. Las conexiones activas pueden continuar.',
        false,
      );
      window.setTimeout(() => {
        if (!this.closed && this.peer && this.peer.disconnected) {
          try {
            this.peer.reconnect();
          } catch {
            // The signaling channel is already gone.
          }
        }
      }, 1800);
    });
  }

  private async connectToHost(name: string): Promise<void> {
    if (!this.peer) {
      throw new Error('Peer no inicializado.');
    }
    const connection = this.peer.connect(this.hostId, { reliable: true });
    this.connections.set(this.hostId, connection);
    await waitForConnection(connection);
    this.bindClientConnection(connection);
    const welcomePromise = this.waitForWelcome();
    connection.send(
      encodeMessage({
        t: 'hello',
        v: PROTOCOL_VERSION,
        name,
      }),
    );
    await welcomePromise;
    this.ready = true;
  }

  private bindClientConnection(connection: DataConnection): void {
    connection.on('data', (data) => {
      if (typeof data !== 'string' || data.length > MAX_MESSAGE_LENGTH) {
        return;
      }
      if (this.handleClientHandshake(data)) {
        return;
      }
      const message = parseHostMessage(data);
      if (!message) {
        return;
      }
      this.callbacks.onMessage(message, this.hostId);
    });
    connection.on('close', () => {
      if (!this.closed) {
        this.close('El anfitrión ha cerrado la conexión.');
      }
    });
    connection.on('error', (error) => {
      this.callbacks.onError?.(error.message || 'Error del canal P2P.', false);
    });
  }

  private welcomeResolve: (() => void) | null = null;

  private waitForWelcome(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.welcomeResolve = resolve;
      window.setTimeout(() => {
        if (!this.ready) {
          this.welcomeResolve = null;
          reject(new Error('El anfitrión no respondió. Verifica el código corporativo.'));
        }
      }, 16_000);
    });
  }

  private handleClientHandshake(raw: string): boolean {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { v?: unknown }).v !== PROTOCOL_VERSION
    ) {
      return false;
    }
    const message = parsed as Record<string, unknown>;
    if (message.t === 'welcome') {
      if (typeof message.selfId !== 'string' || typeof message.hostId !== 'string') {
        return true;
      }
      const roster = this.parseRoster(message.roster);
      if (!roster) {
        return true;
      }
      this.selfId = message.selfId;
      this.hostId = message.hostId;
      this.roster = roster;
      this.welcomeResolve?.();
      this.welcomeResolve = null;
      this.callbacks.onReady(
        this.selfId,
        this.hostId,
        [...this.roster],
        this.roomCode,
        'client',
      );
      return true;
    }
    if (message.t === 'roster') {
      const roster = this.parseRoster(message.roster);
      if (roster) {
        this.roster = roster;
        this.callbacks.onRoster([...roster]);
      }
      return true;
    }
    return false;
  }

  private parseRoster(value: unknown): RosterEntry[] | null {
    if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PLAYERS) {
      return null;
    }
    const roster: RosterEntry[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      if (typeof item !== 'object' || item === null) {
        return null;
      }
      const entry = item as Record<string, unknown>;
      if (typeof entry.id !== 'string' || seen.has(entry.id)) {
        return null;
      }
      const color =
        typeof entry.color === 'number' && Number.isFinite(entry.color)
          ? Math.max(0, Math.min(3, Math.floor(entry.color)))
          : roster.length;
      seen.add(entry.id);
      roster.push({
        id: entry.id.slice(0, 96),
        name: sanitizeName(String(entry.name ?? 'Operario')),
        color,
        isHost: Boolean(entry.isHost),
      });
    }
    return roster;
  }

  private acceptConnection(connection: DataConnection): void {
    if (this.closed || this.roster.length >= MAX_PLAYERS) {
      connection.close();
      return;
    }
    if (this.connections.has(connection.peer)) {
      connection.close();
      return;
    }
    this.connections.set(connection.peer, connection);
    connection.on('data', (data) => {
      if (typeof data !== 'string' || data.length > MAX_MESSAGE_LENGTH) {
        return;
      }
      if (!this.accepted.has(connection.peer)) {
        const message = parseClientMessage(data);
        if (!message || message.t !== 'hello') {
          return;
        }
        this.pendingNames.set(connection.peer, message.name);
        this.finishJoin(connection);
        return;
      }
      const message = parseClientMessage(data);
      if (!message || message.t === 'hello') {
        return;
      }
      this.callbacks.onMessage(message, connection.peer);
    });
    connection.on('close', () => {
      this.connections.delete(connection.peer);
      this.pendingNames.delete(connection.peer);
      if (!this.accepted.has(connection.peer)) {
        return;
      }
      this.accepted.delete(connection.peer);
      this.removeFromRoster(connection.peer);
      this.callbacks.onPeerLeft?.(connection.peer);
      this.callbacks.onRoster([...this.roster]);
      this.broadcastRoster();
    });
    connection.on('error', (error) => {
      this.callbacks.onError?.(error.message || 'Error de un operario conectado.', false);
    });
  }

  private finishJoin(connection: DataConnection): void {
    if (this.roster.length >= MAX_PLAYERS) {
      connection.close();
      return;
    }
    const name = this.pendingNames.get(connection.peer) ?? 'Operario';
    const color = this.nextColor();
    this.accepted.add(connection.peer);
    this.roster.push(makeSelfEntry(connection.peer, name, color, false));
    const welcome: HostMessage = {
      t: 'welcome',
      v: PROTOCOL_VERSION,
      selfId: connection.peer,
      hostId: this.selfId,
      roster: [...this.roster],
    };
    connection.send(encodeMessage(welcome));
    this.broadcastRoster();
    this.callbacks.onRoster([...this.roster]);
    this.callbacks.onPeerJoined?.(connection.peer);
  }

  private nextColor(): number {
    const used = new Set(this.roster.map((entry) => entry.color));
    for (let index = 0; index < MAX_PLAYERS; index += 1) {
      if (!used.has(index)) {
        return index;
      }
    }
    return this.roster.length % MAX_PLAYERS;
  }

  private removeFromRoster(peerId: string): void {
    this.roster = this.roster.filter((entry) => entry.id !== peerId);
  }

  private broadcastRoster(): void {
    if (this.role !== 'host') {
      return;
    }
    const message: HostMessage = {
      t: 'roster',
      v: PROTOCOL_VERSION,
      roster: [...this.roster],
    };
    this.broadcast(message);
  }

  sendToHost(message: ClientMessage): boolean {
    if (this.role !== 'client' || this.closed) {
      return false;
    }
    const connection = this.connections.get(this.hostId);
    if (!connection || !connection.open) {
      return false;
    }
    return this.sendRaw(connection, encodeMessage(message));
  }

  broadcast(message: HostMessage, exceptPeerId?: string): void {
    if (this.role !== 'host' || this.closed) {
      return;
    }
    const raw = encodeMessage(message);
    if (raw.length > MAX_MESSAGE_LENGTH) {
      return;
    }
    for (const [peerId, connection] of this.connections) {
      if (peerId === exceptPeerId || !this.accepted.has(peerId)) {
        continue;
      }
      this.sendRaw(connection, raw);
    }
  }

  sendTo(peerId: string, message: HostMessage): boolean {
    if (this.role !== 'host' || this.closed) {
      return false;
    }
    const connection = this.connections.get(peerId);
    if (!connection || !this.accepted.has(peerId)) {
      return false;
    }
    return this.sendRaw(connection, encodeMessage(message));
  }

  private sendRaw(connection: DataConnection, raw: string): boolean {
    if (!connection.open || raw.length > MAX_MESSAGE_LENGTH) {
      return false;
    }
    try {
      void connection.send(raw);
      return true;
    } catch {
      return false;
    }
  }

  getRole(): 'host' | 'client' {
    return this.role;
  }

  isHost(): boolean {
    return this.role === 'host';
  }

  getRoomCode(): string {
    return this.roomCode;
  }

  getSelfId(): string {
    return this.selfId;
  }

  getHostId(): string {
    return this.hostId;
  }

  getSelfName(): string {
    return this.selfName;
  }

  getRoster(): RosterEntry[] {
    return [...this.roster];
  }

  getPlayerCount(): number {
    return this.roster.length;
  }

  isConnected(): boolean {
    return !this.closed;
  }

  close(reason = 'Has abandonado la sala.'): void {
    if (this.closed) {
      return;
    }
    if (this.role === 'host') {
      this.broadcast({ t: 'disconnect', v: PROTOCOL_VERSION, reason });
    }
    this.closed = true;
    for (const connection of this.connections.values()) {
      try {
        connection.close();
      } catch {
        // Channel already closed.
      }
    }
    this.connections.clear();
    this.accepted.clear();
    this.pendingNames.clear();
    this.welcomeResolve = null;
    this.destroyPeer();
    this.callbacks.onClosed?.(reason);
  }

  private destroyPeer(): void {
    if (!this.peer) {
      return;
    }
    try {
      this.peer.destroy();
    } catch {
      // Peer already destroyed.
    }
    this.peer = null;
  }
}
