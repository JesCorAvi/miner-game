---
name: world-determinism
description: "Genera y modifica terreno, recursos, cofres, semillas y late-join deterministas en Carbon Magnate. Úsala al tocar Terrain, Resources, Rng, dropSeed, nodeId o el orden de loadSnapshot."
---

# World Determinism

## Overview

Carbon Magnate comparte un pozo determinista de 48 × 48 × 120 m. El anfitrión elige la semilla diaria; todos los clientes reconstruyen el mismo terreno, las mismas vetas y los mismos cofres a partir de esa semilla y de los eventos de excavación. El subsuelo es un **cubo macizo**: no hay túnel central, cuevas ni geodas naturales; solo los carves abren huecos.

La generación se apoya en `mulberry32`, `hash3`/`hashString` y ruido de valor de `src/core/Rng.ts`. El orden de carga de `DayCycle.loadSnapshot()` es un invariante de sincronización, no una preferencia de estilo.

## When to Use

- Cambiar `src/world/Terrain.ts`, `Resources.ts` o `MarchingCubes.ts`.
- Tocar semillas, `randomSeed`, `mulberry32`, ruido o hashes.
- Añadir o renombrar minerales, cofres, capas o `nodeId`.
- Cambiar `dropSeed`, la recompensa de cofre o la colocación de nodos.
- Tocar el historial de carves, la zona segura, el spawn o el late-join del mundo.
- Depurar desincronización de vetas, cofres o terreno entre host y cliente.

## When Not to Use

- Cambiar mensajes o frecuencias de red: usa `coop-netcode`.
- Ajustar cuotas, precios o probabilidades de economía: usa `balance-and-loop`.
- Cambiar mallas, materiales o texturas: usa `procedural-content`.
- Cambiar HUD, tienda o pixel mode: usa `hud-and-shop`.

## Mandatory Workflow

1. **Clasifica.** Terreno base, recursos/cofres, carve, semilla o late-join.
2. **Lee la referencia.** `references/terrain-and-generation.md`.
3. **Localiza la fuente de aleatoriedad.** Debe ser `mulberry32`/`hash`; nunca `Math.random()` en generación.
4. **Conserva el orden de carga.** `terrain.generate` → `resources.generate` → `applyCarveHistory` → `markBroken`/`setNodeHp`.
5. **Comprueba IDs y dureza.** Los `nodeId` incluyen el día y contadores estables; los nodos se colocan dentro de roca maciza.
6. **Ejecuta la auditoría.** `node .claude/skills/world-determinism/scripts/audit-world.mjs`.
7. **Prueba en juego.** Mundo nuevo, carve, recarga del día y late-join con dos ventanas.

**Condición de parada:** si el cambio exige una decisión de diseño (nueva capa, nuevo mineral, tamaño del pozo), propone una opción compatible con las invariantes y declara la suposición. No preguntes por valores que ya están en `config.ts`.

## Source Table

| Sistema | Archivo | Export / método |
|---|---|---|
| PRNG y ruido | `src/core/Rng.ts` | `mulberry32`, `hash2`, `hash3`, `hashString`, `valueNoise3`, `fbm3` |
| Rejilla y chunks | `src/world/Terrain.ts` | `GRID_*`, `CHUNK_*`, `generate`, `carve`, `applyCarveHistory` |
| Isosuperficie | `src/world/MarchingCubes.ts` | `buildChunkGeometry`, `createTerrainMaterial`, `geometryFromChunk` |
| Vetas y cofres | `src/world/Resources.ts` | `generate`, `markBroken`, `setNodeHp`, `getBrokenIds`, `getDamagedSnapshot` |
| Día y carga del mundo | `src/core/DayCycle.ts` | `beginAuthorityDay`, `loadSnapshot`, `finishDay`, `startNextDay`, `saveRun` |
| Snapshot de red | `src/core/NetworkBridge.ts` | `buildSnapshot` |
| Drops y carves | `src/core/Combat.ts` | `getDropSeed`, `recordCarve`, `applyLocalCarve` |
| Constantes | `src/config.ts` | `PIT_SIZE`, `MINE_DEPTH`, `SURFACE_SPAWN`, `SAFE_ZONE_HALF`, `MAX_PELLETS` |

## Non-Negotiable Rules

- **Semilla solo en el host.** `randomSeed()` se llama al iniciar/avanzar día; los clientes reciben `snapshot.seed`. No generes mundos con semillas locales.
- **Cero `Math.random()` en generación.** `Terrain.ts`, `Resources.ts` y `MarchingCubes.ts` deben usar `src/core/Rng.ts`. `Math.random()` solo vale para efectos visuales locales.
- **IDs estables.** Mineral: `d${day}-${type}-${specIndex}-${cluster}-${nodeIndex}`. Cofre: `d${day}-chest-${chest}`. Nunca derives un `nodeId` de coordenadas de red.
- **Orden crítico.** Generar terreno base → generar recursos → aplicar historial de carves → marcar nodos rotos → aplicar hp. Invertirlo desincroniza posiciones e IDs.
- **Subsuelo macizo.** `Terrain.generate()` no llama a `carve()` ni abre cuevas. `Resources.generate()` coloca nodos donde `getDensityAt() > 0.64`.
- **Zona segura no minable.** El dominio minable termina en `±PIT_HALF` (24 m); la plataforma segura llega a `±SAFE_ZONE_HALF` (30,5 m) y el spawn está en `(0, 29)`.
- **Carves solo de jugadores/plantilla.** La generación base y los recursos no se registran como carves. El historial se limita a 4.000 eventos y solo lo conserva el host.
- **Drops deterministas.** ``dropSeed = hashString(`${seed}:${nodeId}:drop`)``; la pasiva de cofre se deriva de ``hashString(`${seed}:${nodeId}:chest`)``.
- **El cliente aplica y envía, no registra.** `applyLocalCarve()` predice localmente y manda `carve`; `recordCarve()` es exclusivo de la autoridad.
- **Nunca se envían mallas.** El late-join reconstruye con semilla + historial + nodos rotos/hp.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-world.mjs` sin errores.
- **Nivel 1 — Mundo nuevo:** el cubo se genera macizo, sin túnel central, y el spawn queda en la plataforma segura.
- **Nivel 2 — Excavación:** un carve abre el túnel, los chunks se reconstruyen y la densidad usada por el jugador coincide con la malla.
- **Nivel 3 — Nodos:** las vetas están embebidas, se descubren al excavar y su `nodeId` no cambia al recargar el día.
- **Nivel 4 — Late-join:** con dos ventanas, el cliente que entra a mitad ve el mismo terreno, los mismos nodos rotos y el mismo hp restante.

**Reporta el nivel alcanzado y qué escenario (día, semilla, late-join) no se pudo probar.**

## Output Expectations

- Capa modificada y fuente de aleatoriedad usada.
- Archivos tocados y, si aplica, IDs/constantes antes y después.
- Resultado de `audit-world.mjs`.
- Niveles de validación alcanzados y riesgos de desincronización.

## References

- `references/terrain-and-generation.md` — rejilla, Marching Cubes, orden de carga, IDs, drops, late-join y zona segura.

## Related Skills

- `coop-netcode` — carves, `node_break`, snapshots y late-join.
- `procedural-content` — Marching Cubes, materiales y geometría.
- `balance-and-loop` — HP, rendimiento y reparto de minerales.
