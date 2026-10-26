# Autoridad y ciclo de vida cooperativo

## Roles y fases

- Roles: `solo`, `host`, `client`.
- Fases: `menu`, `lobby`, `playing`, `shop`, `gameover`.
- La victoria no es una fase: es `shop` con `shopVictory = true`.
- `isAuthority()` = `role !== 'client'`. En solo, el jugador es autoridad.

## Handshake

1. Host: `PeerNetwork.host()` reserva un Peer ID `carbon-magnate-v11-<código>` y crea el roster con él mismo como host.
2. Cliente: `PeerNetwork.join()` abre un Peer anónimo y conecta al host con `{ reliable: true }`.
3. Cliente envía `hello { name }`.
4. Host valida `hello`, añade al roster y responde `welcome { selfId, hostId, roster }`.
5. Host difunde `roster` a los demás.
6. `NetworkBridge.networkCallbacks().onReady` pone `online = true`, asigna rol y abre el lobby.

## Inicio de día

- `Session.startOnlineMatch()` (host) fija cuota inicial y semilla, limpia carves y llama a `DayCycle.beginAuthorityDay(true)`.
- `beginAuthorityDay()` construye un `DaySnapshot` vacío y difunde `start_day`.
- Cada cliente llama a `DayCycle.loadSnapshot(game, snapshot, false)` y muestra el banner "TURNO SINCRONIZADO".

## Late-join

- `onPeerJoined(peerId)`:
  - En `menu`/`lobby`: solo anuncia la incorporación.
  - En `gameover`: envía `disconnect` con motivo.
  - En `playing`/`shop`: llama a `sendSnapshotTo(peerId)` → mensaje `sync`.
- `NetworkBridge.sendSnapshotTo()` usa `NetworkBridge.buildSnapshot()`:
  - Carves, nodos rotos, hp, jugadores, staff, escaleras, economía, `dayMoneyBase` y `dayReport` (late-join en tienda).
- El cliente con `sync` y fase `playing` reconstruye el pozo; con `shop` aplica `applyShopSnapshot()`.
- Limitación: los fragmentos que ya estaban en el suelo no se recrean.

## Excavación

- Cliente: `applyLocalCarve()` aplica el carve de inmediato y envía `carve`.
- Host: aplica el carve, `recordCarve()` (solo autoridad), reemite a los demás y genera un impacto visual.
- El historial no incluye la generación base; es solo de acciones de jugadores/plantilla.
- Si el host no aplica el carve (porque no cambia densidad), no se registra.

## Nodos y cofres

- Cliente: `damageNodeLocally()` simula el golpe y envía `node_hit`; si rompe, envía `node_break` con `dropSeed`.
- Host: aplica `node_hit`, reemite y, si rompe, `breakNodeAsHost()`:
  - Marca roto, genera efecto, crea fragmentos con `dropSeed`, suma estadística.
  - Si es cofre, `grantChestReward()` elige la pasiva determinista, la aplica y difunde `passive` con el loadout completo.
- Cliente al recibir `node_break`: `breakNodeAsClient()` reproduce la rotura y la lluvia con el `dropSeed` del host.
- El host conserva `brokenNodes` y `nodeHp` para late-join.

## Depósito

1. El jugador recoge fragmentos → `onLootCollected()` los apila en `Inventory` y sincroniza `cargoCoal`/`cargoMoney` (local).
2. En la tolva, `E` → `depositCargo()`:
   - Exige `phase === 'playing'` y `isNearHopper()`.
   - Vacía **solo los minerales**; herramientas, escaleras y granadas permanecen.
   - Cliente: envía `deposit { coal, money, lines }`; si falla el envío, conserva la carga.
   - Recolectores IA: los simula solo el host. Vuelan hasta las pepitas, cargan 20 kg y, al llegar a la tolva, el host aplica `applyTeamDeposit()` y difunde `economy`; no hay mensaje de depósito por empleado.
   - Host/solo: `applyTeamDeposit()` acredita cuota, dinero y estadísticas.
3. Host con `deposit`: si `phase === 'playing'`, `applyTeamDeposit()` y `broadcastEconomy()`.
4. Cliente con `economy`: aplica `money`/`carbon` con `Math.max` para no retroceder, reloj, día, cuota, stock de escaleras y `grenades`.
5. Al cerrar el día, `discardCargo()` pierde solo los minerales de la mochila.

**Limitación conocida:** el host confía en el importe reportado por el cliente; no hay anti-cheat ni rate limiting (ver `plan.md`).

## Granadas

1. La hotbar selecciona un objeto `grenade` con `tier`; clic → `Game.throwGrenade(tier)`.
2. Cliente: predice el descuento local y envía `grenade_use { tier }`.
3. Host: valida stock en `loadout.grenades`, descuenta, `syncEquipmentInventory()` y `broadcastEconomy()`.
4. `economy.grenades` sincroniza los stocks; la explosión y los carves siguen el flujo normal de `fx`/`carve`.
5. La potencia (`maxLayer`) se aplica en `Combat.explodeGrenade()`; el host no recibe el tier en el FX de explosión.

## Escaleras

- Stock de equipo en `run.loadout.ladders`.
- Cliente con `E`:
  - Comprueba stock local, `findLadderCandidate()`/`findLadderPlacement()`, descuenta una unidad y añade localmente.
  - Envía `ladder_place` con `orientation` y `anchorId`.
- Host con `ladder_place`:
  - Si fase ≠ playing o stock ≤ 0: `broadcastEconomy()` y descarta.
  - Si `ladders.add()` funciona: descuenta stock, reemite `ladder_placed` a los demás y difunde `economy`.
- Host al colocar: descuenta, añade, difunde `ladder_placed` y `economy`.
- Las instancias colocadas no se guardan; `DayCycle.loadSnapshot()` llama a `ladders.fromSnapshot()` al empezar el día. El snapshot conserva orientación, anclaje y longitud.
- `MAX_LADDERS = 80` en `Ladders.ts`; el parser limita `height` a 1–8 y el id a 64 chars.

## Compras

- La tienda solo se abre tras un día exitoso (`phase === 'shop' && shopSuccess`).
- Cliente: `requestPurchase(itemId)` envía `purchase`.
- Host: `ShopView.applyPurchase(game, itemId)` delega la validación en `applyPurchaseToRun()` (`src/core/Shop.ts`) y conserva los efectos. La validación comprueba:
  - Arma no poseída y dinero suficiente.
  - Mejora por debajo del máximo y dinero suficiente.
  - `supply:ladders` → +4 escaleras por 30.
  - `employee_hire:miner` → nuevo `emp-${nextId}`, rank 0, máximo 6.
  - `employee_rank:<id>` → sube rank, conserva id.
  - `employee_convert:<id>` → minero → recolector, conserva id/rank, coste 150.
  - `applyPurchaseToRun()` descuenta el dinero; `ShopView.applyPurchase()` reproduce audio, actualiza el loadout, guarda y difunde `shop_state`.
- `DayCycle.startNextDay()` solo lo ejecuta el host; los clientes esperan `start_day`.
- `DayCycle.saveRun()` no escribe nada si `role === 'client'`.

## Desconexión

- Cliente: si se cierra la conexión, `PeerNetwork.close()` → `handleNetworkClosed(reason)`; vuelve al menú o muestra el overlay de red.
- Host: si se desconecta, la sesión termina para todos; no hay migración.
- `onPeerLeft` elimina el estado remoto y avisa en partida/tienda.
- No hay reconexión automática ni heartbeat explícito.

## Prueba mínima de red

1. Dos ventanas: crear sala y unirse por código.
2. Empezar día; comprobar mismo terreno y misma cuota.
3. Picar y romper un nodo; comprobar fragmentos y hp.
4. Entrar una tercera ventana a mitad de día; comprobar carves, nodos y escaleras.
5. Colocar una escalera desde el cliente; comprobar stock y `ladder_placed`.
6. Depositar desde el cliente; comprobar economía y tolva en ambos.
7. Comprar desde el cliente; comprobar `shop_state` y loadout.
8. Terminar día; comprobar `day_result` y siguiente día.
9. Cerrar el host; comprobar que el cliente vuelve al menú con aviso.
