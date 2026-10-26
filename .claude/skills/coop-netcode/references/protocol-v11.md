# Protocolo v11

## Constantes

- `PROTOCOL_VERSION = 11` en `src/network/Protocol.ts`.
- `MAX_MESSAGE_LENGTH = 512 * 1024`.
- `PEER_ID_PREFIX = 'carbon-magnate-v11-'` en `src/config.ts`.
- El mundo mide 48 × 48 × 120 m (`PIT_HALF = 24`); las cotas de posición se derivan de `PIT_HALF`.
- Código de sala: 6 caracteres de `ROOM_ALPHABET` (sin `0/O/1/I`).
- Topología estrella: cliente ↔ host. Sin servidor dedicado ni migración de host.
- Todos los mensajes van por el DataChannel fiable de PeerJS; no hay canal unreliable.

## Mensajes cliente → host

| Tag | Campos | Cuándo | Validación |
|---|---|---|---|
| `hello` | `name` | Handshake al conectar | `sanitizeName`, 16 chars |
| `state` | `state: PlayerWireState` | 20 Hz | posiciones ±13/±125, yaw finito, pitch ±1.6, arma válida |
| `carve` | `e: CarveEvent` | Cada excavación | `x ±12.5`, `y -121..6`, `z ±12.5`, `r 0.1..5.5`, `s 0.05..2.5` |
| `node_hit` | `id`, `dmg` | Cada golpe | `dmg 1..500`, `id` 96 chars |
| `node_break` | `id`, `dropSeed` | Rotura predicha | `dropSeed` uint32, `id` 96 chars |
| `deposit` | `coal`, `money`, `lines: DaySaleLine[]` | `E` junto a la tolva | enteros 0..1.000.000; `lines` ≤32, mineral válido, importes acotados |
| `grenade_use` | `tier` | Cliente lanza una granada | `tier` ∈ frag/charge/breach/seismic |
| `ladder_place` | `ladder: NetworkLadderState` | Colocación | `x/z ±(PIT_HALF-0.3)`, `y -119..7`, `n ±1`, `height 1..8`, `orientation` `vertical`/`horizontal`/`diagonal-up`/`diagonal-down`, `anchorId` 64 chars, `id` 64 chars |
| `fx` | `fx: FxWire` | Disparo, rayo, explosión, impacto | cotas por tipo |
| `purchase` | `itemId` | Clic en la tienda | string ≤64 chars |

`PlayerWireState = { x, y, z, yaw, pitch, weapon, jetpack, mining }`.

`FxWire`:

- `{ kind: 'shot', weapon, x, y, z, dx, dy, dz }`
- `{ kind: 'lightning', points: number[] }` (6–48 coords)
- `{ kind: 'explosion', x, y, z, radius }`
- `{ kind: 'hit', x, y, z, color, strong }`

## Mensajes host → cliente

| Tag | Campos | Cuándo |
|---|---|---|
| `welcome` | `selfId`, `hostId`, `roster` | Respuesta al `hello` |
| `roster` | `roster` | Alta/baja de jugadores |
| `start_day` | `snapshot: DaySnapshot` | Inicio de día |
| `sync` | `snapshot: DaySnapshot` | Late-join o resincronización |
| `players` | `states: NetworkPlayerState[]` | 20 Hz |
| `staff` | `states: NetworkStaffState[]` | 5 Hz |
| `ladder_placed` | `ladder` | Validación de colocación |
| `carve` | `e`, `by` | Retransmisión a los demás |
| `node_hit` | `id`, `dmg`, `by` | Retransmisión |
| `node_break` | `id`, `dropSeed`, `by` | Retransmisión / rotura autoritativa |
| `economy` | `money`, `carbon`, `timeLeft`, `day`, `quota`, `ladders`, `grenades` | 4 Hz y tras depósito/compra/uso de granada |
| `fx` | `fx`, `by` | Retransmisión visual |
| `day_result` | `success`, `victory`, `day`, `carbon`, `quota`, `money`, `loadout`, `stats`, `report: DayReport`, `infinite`, `message` | Fin de día exitoso; `report` alimenta la liquidación |
| `shop_state` | `money`, `loadout`, `stats`, `quota`, `day`, `infinite` | Tras compra o al abrir tienda |
| `passive` | `passive`, `title`, `loadout`, `by` | Cofre abierto |
| `game_over` | `stats`, `message` | Cuota incumplida |
| `error` | `message` | Error de red/validación |
| `disconnect` | `reason` | Cierre de sesión o sala finalizada |

## DaySnapshot

```ts
interface DaySnapshot {
  phase: 'playing' | 'shop' | 'gameover' | 'victory';
  day: number;
  seed: number;
  quota: number;
  timeLeft: number;
  money: number;
  carbon: number;
  dayMoneyBase: number;
  dayReport: DayReport | null;
  infinite: boolean;
  loadout: Loadout;
  stats: RunStats;
  carveHistory: CarveEvent[];
  brokenNodes: string[];
  nodeHp: Record<string, number>;
  players: NetworkPlayerState[];
  staff: NetworkStaffState[];
  ladders: NetworkLadderState[];
}
```

Topes del parser: 4 jugadores, 16 estados de staff, 200 escaleras, 5.000 carves, 2.000 entradas de `nodeHp`. La v11 añade `diagonal-up`/`diagonal-down` al estado de escalera. La v10 retira la arcilla y los escombros de roca del loot, hace que el carbón aporte dinero además de cuota y cambia la IA del recolector; la generación baja a ~7.800 vetas. La v9 añade la composición `deposit.lines` y `day_result.report` (bonus de rendimiento y desglose), y el snapshot incluye `dayReport` para late-join en tienda.

## Validación

- `parseClientMessage(raw)` y `parseHostMessage(raw)` comprueban longitud y `v === PROTOCOL_VERSION`.
- Devuelven `null` ante cualquier campo inválido; el llamador ignora el mensaje.
- `parseSnapshot()` reconstruye arrays saneados y descarta entradas inválidas.
- `NetworkPlayerState` usa `sanitizeName`; `NetworkLadderState` sanea `id`.
- No se aceptan mensajes desconocidos.

## Cambiar el protocolo

1. Edita `Protocol.ts` (DTO, parser, snapshot).
2. Actualiza ambos lados de `NetworkMessages.ts` (`handleClientMessage`/`handleHostMessage`).
3. Actualiza `NetworkBridge.buildSnapshot()` y `DayCycle.loadSnapshot()`.
4. Sube `PROTOCOL_VERSION` y `PEER_ID_PREFIX` a la vez.
5. Actualiza `CLAUDE.md`, `plan.md` y este documento.
6. Ejecuta `audit-netcode.mjs` y prueba con dos ventanas.

Si cambia la generación determinista compartida, también hay que subir la versión aunque la forma de los mensajes no cambie.

## Prohibiciones de payload

- No `mesh`, `meshes`, `geometry` ni arrays de vértices.
- No posiciones de fragmentos ni el array completo de miles de pellets. El inventario de objetos (minerales, herramientas, escaleras, granadas) es local; viajan el `deposit` agregado y el `grenade_use` del tier, no la disposición de slots.
- No el array completo de nodos por tick.
- No lógica autoritativa en el cliente.
