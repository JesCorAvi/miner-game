import type { RosterEntry } from '../types';

export interface LobbyViewData {
  code: string;
  role: 'host' | 'client';
  roster: RosterEntry[];
  status: string;
  error: string;
  canStart: boolean;
}

function required<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No se encontró el elemento #${id}`);
  return el as T;
}

export class LobbyView {
  private readonly overlay = required<HTMLElement>('lobby-overlay');
  private readonly code = required<HTMLElement>('lobby-code');
  private readonly role = required<HTMLElement>('lobby-role');
  private readonly status = required<HTMLElement>('lobby-status');
  private readonly count = required<HTMLElement>('lobby-count');
  private readonly roster = required<HTMLElement>('lobby-roster');
  private readonly error = required<HTMLElement>('lobby-error');
  private readonly start = required<HTMLButtonElement>('lobby-start');
  private readonly leave = required<HTMLButtonElement>('lobby-leave');
  private readonly waiting = required<HTMLElement>('lobby-waiting');
  private readonly copyCodeBtn = required<HTMLButtonElement>('copy-code');
  private readonly copyLinkBtn = required<HTMLButtonElement>('copy-link');
  private currentLobby: LobbyViewData | null = null;

  bind(actions: { start: () => void; leave: () => void }): void {
    const protocol = window.location.protocol;
    this.copyLinkBtn.hidden = protocol !== 'http:' && protocol !== 'https:';
    this.start.addEventListener('click', () => actions.start());
    this.leave.addEventListener('click', () => actions.leave());
    this.copyCodeBtn.addEventListener('click', () => {
      void this.copyText(this.code.textContent ?? '', this.copyCodeBtn);
    });
    this.copyLinkBtn.addEventListener('click', () => {
      const room = this.code.textContent ?? '';
      const url = new URL(window.location.href);
      url.searchParams.set('room', room);
      void this.copyText(url.toString(), this.copyLinkBtn);
    });
  }

  show(data: LobbyViewData): void {
    this.currentLobby = data;
    this.overlay.hidden = false;
    this.render(data);
  }

  hide(): void {
    this.overlay.hidden = true;
    this.currentLobby = null;
  }

  getCurrentLobby(): LobbyViewData | null {
    return this.currentLobby;
  }

  setStatus(status: string, error = ''): void {
    if (!this.currentLobby) return;
    this.currentLobby = { ...this.currentLobby, status, error };
    this.render(this.currentLobby);
  }

  private async copyText(text: string, button: HTMLButtonElement): Promise<void> {
    const oldLabel = button.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'COPIADO';
    } catch {
      button.textContent = text;
    }
    window.setTimeout(() => {
      button.textContent = oldLabel;
    }, 1400);
  }

  private render(data: LobbyViewData): void {
    this.code.textContent = data.code || '------';
    this.role.textContent = data.role === 'host' ? 'ANFITRIÓN' : 'CLIENTE';
    this.status.textContent = data.status;
    this.status.classList.toggle('is-error', Boolean(data.error));
    this.error.textContent = data.error;
    this.count.textContent = `${data.roster.length}/4`;
    this.roster.replaceChildren();
    for (const entry of data.roster) {
      const row = document.createElement('div');
      row.className = 'roster-entry';
      const swatch = document.createElement('span');
      swatch.className = 'roster-swatch';
      swatch.style.setProperty('--slot-color', this.rosterColor(entry.color));
      const name = document.createElement('span');
      name.className = 'roster-name';
      name.textContent = entry.name;
      const tag = document.createElement('span');
      tag.className = 'roster-tag';
      tag.textContent = entry.isHost ? 'HOST' : 'OPERARIO';
      row.append(swatch, name, tag);
      this.roster.appendChild(row);
    }
    const isHost = data.role === 'host';
    this.start.hidden = !isHost;
    this.waiting.hidden = isHost;
    this.start.disabled = !data.canStart;
    this.start.textContent = data.canStart ? 'INICIAR TURNO' : 'SIN CONEXIONES';
  }

  private rosterColor(index: number): string {
    return ['#e6a449', '#6fdcd2', '#c8a8ff', '#ff8065'][index % 4];
  }
}
