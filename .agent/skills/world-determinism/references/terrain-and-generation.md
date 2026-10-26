# Terreno y generación determinista

## Dominio y rejilla

- `PIT_SIZE = 48`, `PIT_HALF = 24`, `MINE_DEPTH = 120`.
- Rejilla de densidad: `GRID_X = PIT_SIZE + 1 = 49`, `GRID_Y = 129`, `GRID_Z = 49`, celda de 1 m.
- Origen: `(-PIT_HALF, -MINE_DEPTH, -PIT_HALF) = (-24, -120, -24)`.
- Chunks: `CHUNK_X = 4`, `CHUNK_Y = 16`, `CHUNK_Z = 4`; celdas de `12 × 8 × 12`.
- `Terrain.getDensityAt()` interpola trilinealmente; `> 0.5` es sólido. Jugador, loot, IA y raycast consultan densidad, nunca triángulos.

## Generación base (`Terrain.generate`)

1. Limpia mallas y fija `seed >>> 0`.
2. Calcula `phase = (seed % 6283) / 1000`.
3. Para cada muestra:
   - Fuera de `0 ≤ depth ≤ 120`: densidad 0.
   - `broad`, `detail` y `strata` con `fbm3`/`sin` para la roca.
   - No hay `surfaceShift` ni `shaftRadius`: la superficie es plana en `y = 0` y todo el volumen interior es sólido.
   - Bordes de la rejilla: densidad 1 para cerrar el cubo.
4. Marca todos los chunks sucios y reconstruye.

**Cubo macizo sin túnel central.** `generate()` no llama a `carve()`; cualquier hueco procede de jugadores o plantilla. El fondo (`y = -120`) y los cuatro laterales (`x/z = ±PIT_HALF`) tienen una capa de bedrock visible y el jugador se detiene antes de atravesarla; no dejes huecos que se vean como paredes invisibles.

## Carve

`CarveEvent = { x, y, z, r, s }`.

- `Terrain.carve(event, deferRebuild = false)` afecta a las muestras dentro de `r + 1.15`.
- La caída es suave: `target = 0.5 - s * 1.12 * smooth^1.7 * macro`.
- Solo baja la densidad (`data[index] = Math.max(0, target)`); nunca rellena.
- Marca chunks sucios y reconstruye como máximo 5 por llamada (o todos si `deferRebuild`).
- `applyCarveHistory(events)` aplica todos con `deferRebuild = true` y reconstruye una vez.
- El historial de red solo contiene carves de jugadores/plantilla, máximo 4.000 (`CARVE_HISTORY_LIMIT`).

## Recursos (`Resources.generate`)

- PRNG: `mulberry32(seed ^ hashString(\`resources-${day}\`))`.
- `SPECS` define tipo, número de racimos, nodos por racimo y rango de profundidad.
- Cada nodo se coloca en un intento dentro del racimo; debe cumplir `terrain.getDensityAt(x, y, z) > 0.64`, es decir, dentro de roca maciza.
- Los centros de racimo se sortean en todo el cubo usando el PRNG del día; el yacimiento cambia de posición cada jornada.
- `nodeId`:
  - Mineral: `d${day}-${type}-${specIndex}-${cluster}-${nodeIndex}`.
  - Cofre: `d${day}-chest-${chest}`.
- `clusterId`: `${day}-${type}-${specIndex}-${cluster}`.
- ~7.800 nodos y 16 cofres por día, HP 92 para cofres, recompensa pasiva determinista. La densidad es deliberadamente alta (≈7× la versión anterior). Solo hay vetas de carbón, minerales y gemas; la arcilla y la roca no generan nodos looteables.
- La generación **no** abre cavidades; el jugador descubre los nodos excavando.

## Cofres y drops

- `getDropSeed(node) = hashString(\`${seed}:${node.id}:drop\`) >>> 0`.
- `LootField.spawnFromNode(node, terrain, dropSeed)` reparte `carbonYield`/`moneyYield` entre 7–10 fragmentos de rotura; cada golpe previo añade 1–2 chips y descuenta su valor del lote local.
- Cada fragmento lleva `MINERALS[].weight` (0,12–0,24 kg) y entra en el inventario de slots; la mochila se limita por peso y por stacks.
- La pasiva del cofre: `hashString(\`${seed}:${node.id}:chest\`)` → `mulberry32` → `PASSIVE_ORDER`.
- El host elige y difunde la pasiva; el cliente reproduce la lluvia con `dropSeed`.

## Orden crítico de carga

`DayCycle.loadSnapshot(game, snapshot, authority)`:

1. `game.terrain.generate(game.seed)`
2. `game.resources.generate(game.seed, game.run.day, game.terrain)`
3. `game.terrain.applyCarveHistory(snapshot.carveHistory)`
4. `game.resources.markBroken(nodeId)` por cada nodo roto
5. `game.resources.setNodeHp(nodeId, hp)` por cada hp restante
6. Limpiar loot, recolocar jugador, cargar escaleras, staff y avatares

Invertir 1–3 cambia la posición/ID de los nodos y desincroniza host y clientes. Nunca marques nodos rotos antes de generar recursos.

## Zona segura y spawn

- Dominio minable: `|x| ≤ 24`, `|z| ≤ 24`, `-120 ≤ y ≤ 0`.
- Plataforma segura: hasta `±SAFE_ZONE_HALF = ±30.5`, a `SURFACE_DECK_Y = 0.01`.
- Spawn: `SURFACE_SPAWN = (0, 29)`; tolva en `(14, 28.5)`.
- `Player.isOutsidePit()` devuelve `true` fuera de `±PIT_HALF`; el suelo seguro está en `SAFE_FLOOR_Y = SURFACE_DECK_Y + 0.04`.
- No hay densidad fuera del pozo: no se puede excavar ni colocar explosivos allí.

## Late-join

El snapshot incluye:

- `seed`, `day`, `quota`, `timeLeft`, `money`, `carbon`, `dayMoneyBase`, `dayReport` (solo con fase de tienda).
- `loadout`, `stats`, `phase`.
- `carveHistory` (máximo 4.000 en origen; el parser acepta 5.000).
- `brokenNodes`, `nodeHp`.
- `players`, `staff`, `ladders`.

Limitaciones conocidas:

- No se recrean fragmentos ya presentes en el suelo.
- Un historial truncado puede reconstruir el terreno de forma parcial en días extremos.
- La cuota no cambia al entrar; se fijó al inicio del día.

## Lista de comprobación

- [ ] ¿La aleatoriedad nueva usa `Rng.ts`?
- [ ] ¿El `nodeId` incluye el día y un contador estable?
- [ ] ¿El nodo se coloca dentro de roca maciza?
- [ ] ¿El orden de `loadSnapshot` sigue intacto?
- [ ] ¿El `dropSeed` depende de semilla + nodo?
- [ ] ¿El snapshot incluye carves, rotos, hp y escaleras?
- [ ] ¿Se ha probado con una segunda ventana entrando a mitad de día?
