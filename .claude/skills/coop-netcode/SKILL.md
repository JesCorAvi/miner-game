---
name: coop-netcode
description: "Protocolo v10, snapshots, depósitos, escaleras, granadas, compras y autoridad del anfitrión en el cooperativo P2P de Carbon Magnate. Úsala al cambiar mensajes, frecuencias, late-join o el flujo host/cliente."
---

# Coop Netcode

## Overview

El cooperativo de Carbon Magnate es una topología estrella sobre PeerJS/WebRTC: los clientes solo hablan con el anfitrión, que agrega estados y retransmite. El host es autoritativo para semilla, cuota, reloj, fin de día, compras, cofres y plantilla. Los clientes predicen excavación, daño visual y colocación de escaleras, pero el host valida y difunde el estado compartido.

El contrato vive en `src/network/Protocol.ts` (`PROTOCOL_VERSION = 10`, `MAX_MESSAGE_LENGTH = 512 KiB`), el transporte en `PeerNetwork.ts`, los callbacks/snapshots/ticks en `src/core/NetworkBridge.ts` y los handlers de mensajes en `src/core/NetworkMessages.ts`.

## When to Use

- Añadir o modificar un mensaje, campo, snapshot o frecuencia.
- Tocar `Protocol.ts`, `PeerNetwork.ts`, `NetworkBridge.ts` o `NetworkMessages.ts`.
- Cambiar depósitos, escaleras, compras, cofres o plantilla en co-op.
- Depurar late-join, duplicados, desincronización o desconexiones.
- Cambiar `PROTOCOL_VERSION` o `PEER_ID_PREFIX`.

## When Not to Use

- Cambiar terreno, recursos o semillas: usa `world-determinism`.
- Ajustar precios, cuotas o jetpack: usa `balance-and-loop`.
- Cambiar HUD o tienda: usa `hud-and-shop`.
- Cambiar el empaquetado Electron: usa `desktop-packaging`.

## Mandatory Workflow

1. **Clasifica el cambio.** Estado continuo, mutación puntual, snapshot, economía o ciclo de vida.
2. **Fija la autoridad.** Decide quién calcula y quién observa antes de escribir código.
3. **Define el contrato.** Tag, dirección, campos mínimos, validación y tamaño.
4. **Implementa ambos lados.** `parseClientMessage`/`parseHostMessage`, `NetworkMessages.handleClientMessage`/`handleHostMessage`, `NetworkBridge.buildSnapshot`/`DayCycle.loadSnapshot`.
5. **Cubre el late-join.** Si el estado puede existir antes de que un cliente termine de cargar, debe entrar en `DaySnapshot`.
6. **Sube la versión si cambia la forma del mensaje o la generación compartida (incluido el recuento/colocación de vetas).** Actualiza `PROTOCOL_VERSION` y `PEER_ID_PREFIX` (`carbon-magnate-v10-`) a la vez.
7. **Audita.** `node .claude/skills/coop-netcode/scripts/audit-netcode.mjs`.
8. **Prueba con dos ventanas.** Crear/unirse, late-join, carve, nodo, escalera, depósito, compra y cambio de día.

**Condición de parada:** si el comportamiento cooperativo no está definido (¿el cliente puede hacer X?), pregunta solo por esa decisión de producto y declara la suposición para el resto.

## Authority Decision Table

| Cambio | Autoridad | Mensaje / patrón |
|---|---|---|
| Semilla, cuota, reloj, fin de día | Host | `start_day`, `sync`, `economy`, `day_result`, `game_over` |
| Excavación | Cliente predice; host conserva historial | `carve` por evento ligero `{x,y,z,r,s}` |
| Daño a nodo | Cliente simula; host aplica hp | `node_hit` con `id` y `dmg` |
| Rotura de nodo / cofre | Host decide; cliente reproduce | `node_break` con `dropSeed`; recompensa vía `passive` |
| Carga personal | Inventario local hasta la tolva | Solo viaja el `deposit` agregado con su composición `lines`; los slots no se replican |
| Depósito | Cliente solicita; host acredita | `deposit` `{coal,money,lines}` → `economy`; `lines` alimenta la liquidación |
| Granada consumible | Cliente usa; host valida stock | `grenade_use` `{tier}` → `economy.grenades` |
| Escaleras | Stock del host; orientación/anclaje | `ladder_place` → `ladder_placed` + `economy` |
| Compras | Host valida | `purchase` → `shop_state` |
| Plantilla | Host simula; cliente interpola | `staff` a 5 Hz |
| Movimiento de jugadores | Cada peer; host agrega | `state` 20 Hz → `players` 20 Hz |
| Efectos visuales | Emisor | `fx` sin valor de juego |

## Message Budget

- Estados de jugador: **20 Hz** (`PLAYER_NET_INTERVAL = 1 / 20`).
- Plantilla: **5 Hz** (`STAFF_NET_INTERVAL = 0.2`).
- Economía/reloj: **4 Hz** (`ECONOMY_INTERVAL = 0.25`).
- Carves: un mensaje por evento; historial máximo **4.000**.
- Snapshot máximo: **512 KiB**; `carveHistory` se recorta a 5.000 al parsear, `brokenNodes`/`nodeHp`/`ladders` tienen topes.
- No hay canal unreliable: todos los mensajes van por el DataChannel fiable de PeerJS. No añadas posiciones de fragmentos ni arrays de nodos por tick.

## Non-Negotiable Rules

- **Host autoritativo.** El cliente no cierra el día (`DayCycle.finishDay`), no avanza (`DayCycle.startNextDay`) y no escribe expediente (`DayCycle.saveRun`).
- **Nunca se envían mallas, posiciones de fragmentos ni el array completo de nodos por tick.** Viajan carves, IDs, `dropSeed`, estados agregados, depósitos, escaleras y compras. El inventario de slots es local; el `deposit` sigue siendo agregado.
- **Carga local hasta el depósito.** `onLootCollected()` apila en `Inventory` y sincroniza los agregados locales; `applyTeamDeposit()` acredita cuota/dinero/estadísticas en el host. El cliente envía la composición agregada por mineral (`lines`), no la disposición de slots. Las granadas son consumibles: `grenade_use` descuenta el tier y `economy` reparte el stock.
- **Escaleras de equipo.** El cliente descuenta localmente y envía `ladder_place` con `orientation` (`vertical`/`horizontal`) y `anchorId`; el host valida stock, añade y difunde `ladder_placed` + `economy`. Las colocadas no se guardan.
- **Compras por solicitud.** El cliente envía `purchase`; el host aplica, descuenta y difunde `shop_state`.
- **Cofres.** El host elige la pasiva determinista, la aplica y difunde `passive` con el loadout completo.
- **Snapshots completos.** `NetworkBridge.buildSnapshot()` incluye `dayMoneyBase`, `loadout`, `stats`, `carveHistory`, `brokenNodes`, `nodeHp`, `players`, `staff` y `ladders`.
- **Validación de entrada.** Todo mensaje se parsea con cotas (`bounded`, slices) y se rechaza si `v !== PROTOCOL_VERSION`.
- **Versión y prefijo juntos.** Si cambia la forma de un mensaje o la generación compartida, sube `PROTOCOL_VERSION` y el prefijo PeerJS; los clientes antiguos deben quedar fuera.
- **Handshake separado.** `hello`/`welcome`/`roster` viven en `PeerNetwork.ts`; los mensajes de juego viven en `NetworkMessages.ts`.
- **Sin lógica autoritativa en el cliente.** No muevas compras, cuota, fin de día, recompensas de cofre ni plantilla al cliente.
- **Desconexión.** Si cae el host, la sesión termina; no hay migración ni reconexión automática.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-netcode.mjs` sin errores; todos los tags tienen parser y handler.
- **Nivel 1 — Solo:** la partida local funciona sin tocar ninguna guarda de red.
- **Nivel 2 — Dos peers:** host y cliente ven el mismo terreno, nodos, depósitos, escaleras, compras y economía; sin duplicados.
- **Nivel 3 — Late-join:** un cliente que entra a mitad recibe `sync`, reconstruye el pozo y converge sin reiniciar.
- **Nivel 4 — Ciclo completo:** cambio de día, tienda, desconexión de cliente, desconexión de host y vuelta al menú.

**Reporta el nivel alcanzado y lo que no se pudo probar (por ejemplo, TURN real, latencia o pérdida de paquetes).**

## Output Expectations

- Clasificación del cambio y autoridad elegida.
- Mensajes nuevos/modificados: tag, dirección, campos, validación y frecuencia.
- Archivos tocados y guards añadidos.
- Cobertura de snapshot/late-join.
- Resultado de `audit-netcode.mjs` y nivel de validación.

## References

- `references/protocol-v10.md` — catálogo de mensajes, DTOs, validadores y snapshot.
- `references/authority-and-lifecycle.md` — handshake, depósito, escaleras, compras, desconexión y late-join.

## Related Skills

- `world-determinism` — semilla, carves y reconstrucción del pozo.
- `balance-and-loop` — economía, cuotas y compras que viajan por la red.
- `hud-and-shop` — lobby, tienda y estados online.
