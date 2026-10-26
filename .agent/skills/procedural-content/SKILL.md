---
name: procedural-content
description: "Construye geometría, texturas canvas, materiales, instancing y liberación de VRAM en Carbon Magnate sin activos externos. Úsala al tocar Terrain, Resources, Loot, Hopper, Environment, Avatars, Effects o ToolView."
---

# Procedural Content

## Overview

Todo el arte de Carbon Magnate se genera en tiempo de ejecución con Three.js 0.186 y canvas 2D. No hay imágenes, modelos, fuentes ni sonidos externos. El exterior es pixel art natural (canvas nearest-neighbor, señales, cielo día/noche, montañas y bosque procedurales); el interior es low-poly orgánico con Marching Cubes, flat shading y color por triángulo/cara.

La geometría repetida usa `InstancedMesh` (hasta 6.000 fragmentos, nodos por tipo, chunks de tolva, escombros). La memoria GPU se gestiona con `dispose()` explícito en cada sistema y en `Game.dispose()`. Los iconos del inventario se dibujan en canvas y se cachean como data URL (`MineralIcon.ts`).

## When to Use

- Crear o modificar geometría del terreno, vetas, cofres, fragmentos, tolva, escaleras o escenario.
- Crear iconos procedurales de inventario (`MineralIcon.ts`).
- Añadir materiales, shaders, texturas canvas o señales pixeladas.
- Crear o ajustar avatares, rigs de arma, etiquetas o partículas.
- Cambiar el viewmodel de armas (`ToolView.ts`, `PickaxeModel.ts`).
- Corregir fugas de VRAM, filtros borrosos, instancing o `dispose()`.

## When Not to Use

- Cambiar números de daño, cuota o economía: usa `balance-and-loop`.
- Cambiar HUD, tienda o overlays: usa `hud-and-shop`.
- Cambiar audio: usa `procedural-audio`.
- Replicar una entidad por red: combínala con `coop-netcode`.
- Cambiar el empaquetado del ejecutable: usa `desktop-packaging`.

## Mandatory Workflow

1. **Clasifica la familia.** Terreno, nodo instanciado, pepita, partícula, escenario, avatar, arma en primera persona o UI canvas.
2. **Busca el patrón existente.** Reutiliza la clase y el builder más cercano antes de crear una jerarquía nueva.
3. **Construye con geometría procedural.** `BufferGeometry`, `mergeGeometries`, `InstancedMesh`; cero `TextureLoader`/`GLTFLoader`.
4. **Genera la textura.** Canvas 2D; `NearestFilter` para pixel art; gradiente radial solo cuando la suavidad sea intencionada.
5. **Integra el juego.** Ancla al suelo o a la cámara, actualiza matrices de instancia y enlaza efectos visuales con `Game`/`Effects`.
6. **Cierra el ciclo de vida.** `dispose()` de geometrías, materiales y texturas; `removeFromParent()`.
7. **Audita.** `node .claude/skills/procedural-content/scripts/audit-assets.mjs`.
8. **Prueba rendimiento.** Entrar/salir del día y observar `renderer.info.memory` si se añaden instancias.

**Condición de parada:** si el diseño exige una decisión artística no deducible (silueta, paleta, escala), propone una opción coherente con la clase existente y declara la suposición. No preguntes por colores que ya están en `config.ts` o en un modelo hermano.

## Decision Table

| Necesidad | Base o patrón | Archivo |
|---|---|---|
| Terreno excavable | Campo de densidad + Marching Cubes por chunks | `src/world/Terrain.ts`, `MarchingCubes.ts` |
| Veta o cofre | Geometría fusionada + `InstancedMesh` por tipo | `src/world/Resources.ts` |
| Puntería de veta | `hitSpheres` para broad-phase/asistencia + `Raycaster` contra la geometría instanciada real | `src/world/Resources.ts` |
| Fragmento físico | Un `InstancedMesh` de `MAX_PELLETS` | `src/world/Loot.ts` |
| Tolva y montón | Instancias de chunks + materiales propios | `src/world/Hopper.ts` |
| Escalera colocable | Geometría compartida + `Mesh` por instancia | `src/world/Ladders.ts` |
| Superficie, oficina, carteles | Canvas textures + `MeshStandardMaterial`/`MeshBasicMaterial` | `src/world/Environment.ts` |
| Montañas, bosque, rocas | Heightfield FBM, colores por vértice y vegetación instanciada | `src/world/Landscape.ts` |
| Cielo día/noche, sol/luna, nubes | Domo de shader, FBM de nubes, estrellas y luces interpoladas | `src/world/SkyCycle.ts` |
| Partículas, chispas, escombros, haces | Pools + `Points`/`InstancedMesh` | `src/core/Effects.ts` |
| Avatar remoto o de plantilla | Grupos + etiqueta canvas + linterna | `src/entities/Avatars.ts` |
| Arma en primera persona | Pico: geometría fusionada + `MeshStandardMaterial` en escena propia; resto: `MeshBasicMaterial` | `src/player/ToolView.ts` |
| Inventario por slots | Iconos canvas cacheados + slots DOM + `Inventory.ts` | `src/ui/InventoryView.ts`, `src/ui/MineralIcon.ts` |
| Logo pixel art | Canvas 2D con bitmap 5×7 | `src/ui/PixelLogo.ts` |

## Non-Negotiable Rules

- **Cero activos externos.** Nada de PNG/JPG/GLB/FBX/fuentes/audio; todo se dibuja en canvas o se genera por geometría. Solo se permiten `public/favicon.svg` y `build/icon.svg`.
- **Pixel-art nítido.** `magFilter`/`minFilter = THREE.NearestFilter` en texturas pixeladas. Los gradientes radiales suaves (glow de nodos, polvo) son la excepción intencionada.
- **Instancing para lo repetido.** Fragmentos, nodos, chunks de tolva y escombros no deben crear un `Mesh` por elemento.
- **Silueta y puntería juntas.** Si cambias las astillas o la escala de un nodo, actualiza `MINERAL_HIT_PROXIES`/`buildHitSpheres()`; el broad-phase y la asistencia dependen de esa silueta. El impacto final usa la geometría real, no las esferas.
- **Ciclo de vida limpio.** Cada sistema con geometría/material/texturas define `dispose()`; `Game.dispose()` llama a todos. No dejes recursos vivos al cambiar de día.
- **Marching Cubes estable.** `ISO_LEVEL = 0.5`; normal contra el gradiente; intercambio de vértices si el winding queda invertido; `flatShading` y `vertexColors`; `customProgramCacheKey` para el shader pixelado.
- **Viewmodel aislado.** El pico se renderiza en una escena y un pass propios (`ToolView.render()`, `clearDepth()`) con luces locales y `MeshStandardMaterial`; no lo devuelvas al scene principal ni lo ilumines con la linterna. Las demás armas siguen con `MeshBasicMaterial`. Fusiona la geometría estática por material para no multiplicar draw calls.
- **Escenario anclado.** El terreno, la valla y la tolva respetan `SURFACE_DECK_Y` y `PIT_HALF`; no coloques geometría minable en la zona segura.
- **Aleatoriedad visual local.** `Math.random()` puede usarse en partículas y temblor, nunca en la generación del mundo (ver `world-determinism`).
- **Sin mallas por red.** Las entidades visuales se reconstruyen localmente; solo viajan IDs, estados y eventos.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-assets.mjs` sin activos externos, loaders prohibidos ni sistemas sin `dispose()`.
- **Nivel 1 — Escena:** el modelo aparece anclado, sin caras invertidas, parpadeos ni texturas borrosas.
- **Nivel 2 — Juego:** la geometría interactúa bien con densidad, raycast, magnetismo o colisiones.
- **Nivel 3 — Memoria:** generar/cargar el día varias veces no incrementa de forma sostenida `renderer.info.memory`.
- **Nivel 4 — Presentación:** pixel mode exterior, low-poly interior, viewmodel y avatares coherentes en navegador y Electron.

**Reporta el nivel alcanzado y cualquier comprobación visual o de memoria que no se haya podido ejecutar.**

## Output Expectations

- Familia de entidad y patrón elegido.
- Archivos tocados y jerarquía (geometría, materiales, instancias, texturas).
- Cómo se comparten y liberan los recursos.
- Resultado de `audit-assets.mjs`.
- Niveles de validación alcanzados y riesgos.

## References

- `references/geometry-and-materials.md` — Marching Cubes, materiales, canvas, pixel art y viewmodel.
- `references/instancing-and-dispose.md` — presupuestos de instancing, pools, dispose y fugas de VRAM.

## Related Skills

- `world-determinism` — densidad, carves y colocación de nodos.
- `procedural-audio` — feedback sonoro de impactos y mejoras.
- `hud-and-shop` — logo, iconos y paneles.
- `coop-netcode` — entidades replicadas.
