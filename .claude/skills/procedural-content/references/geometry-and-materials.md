# Geometría, materiales y texturas procedurales

## Marching Cubes

`src/world/MarchingCubes.ts`:

- `ISO_LEVEL = 0.5`; densidad > 0.5 es sólido.
- `buildChunkGeometry(grid, startIX, startIY, startIZ, cellsX, cellsY, cellsZ, colorAt)`:
  - Recorre celdas y usa `triTable` de `three/addons/objects/MarchingCubes.js`.
  - Calcula el gradiente de densidad y lo invierte para apuntar al aire.
  - Si el producto escalar con la normal del triángulo es negativo, intercambia `b` y `c` para corregir el winding.
  - Genera posiciones, normales planas (una por triángulo) y color por triángulo.
- `createTerrainMaterial()`:
  - `MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.94, metalness: 0.02 })`.
  - `onBeforeCompile` inyecta ruido pixelado con `vPixelRockWorld`.
  - `customProgramCacheKey = 'carbon-terrain-pixel-1'`.
- `geometryFromChunk(data)` crea `BufferGeometry` y calcula bounding sphere/box.

No cambies el orden de los vértices ni las normales sin volver a probar el terreno: una cara invertida se ve negra o desaparece con el backface culling.

## Terreno

- Rejilla de 1 m, 49 × 129 × 49; chunks de 12 × 8 × 12 celdas (4 × 16 × 4).
- La malla se reconstruye por chunks sucios; `update()` limita a 4 por frame y `flushDirty()` fuerza todo.
- `dispose()` libera material y geometrías de chunks.
- No se generan cuevas; el pozo central y los carves son los únicos huecos.

## Texturas canvas

Reglas:

- `new THREE.CanvasTexture(canvas)`; nada de `TextureLoader`.
- Pixel art: `magFilter = minFilter = THREE.NearestFilter`; `generateMipmaps = false` recomendable.
- Glow suave, polvo o etiquetas: gradiente radial/lineal y filtro suave intencionado.
- Asigna `texture.colorSpace = THREE.SRGBColorSpace` cuando corresponda.
- Libera con `texture.dispose()`.

Texturas existentes:

| Archivo | Textura | Filtro |
|---|---|---|
| `Environment.ts` | Superficies, carteles y bordillo | Nearest |
| `SkyCycle.ts` | Brillo suave de estrella (el cielo es un shader) | Suave |
| `Hopper.ts` | Cartel de tolva, peligro | Nearest |
| `Resources.ts` | Glow radial de nodos | Suave (radial) |
| `Effects.ts` | Polvo radial | Suave (radial) |
| `Avatars.ts` | Etiqueta de nombre | Suave (texto) |

## Escenario y oficina

`Environment.ts`:

- Plataforma segura, spawn pad, flechas al suelo, carteles y oficina. Sin valla metálica ni skyline urbano.
- Usa `MeshStandardMaterial`/`MeshBasicMaterial` y `CanvasTexture`.
- `Landscape.ts` construye un heightfield FBM con colores por vértice, flat shading, bosque/rocas instanciados, vegetación de borde y montañas con nieve. No uses conos como montañas.
- `SkyCycle.ts` usa un domo de shader con gradiente atmosférico, sol/luna, nubes FBM y estrellas; el domo sigue a la cámara y `Game.update()` le pasa el progreso del turno (0 mañana → 1 noche). Las luces se atenúan bajo tierra.
- Los carteles son pixelados; el interior de la oficina no necesita el filtro de cuantización.
- `dispose()` recorre meshes/points y libera geometrías, materiales y texturas registradas; `SkyCycle.dispose()` libera el domo, el shader, las estrellas, la textura de estrella y las luces.

## Avatares

`Avatars.ts`:

- Rig de cuerpo, arma, linterna de casco y llama de jetpack.
- Etiqueta de nombre con canvas (`makeLabel`), sprite y material.
- `RemotePlayerAvatars` y `StaffAvatars` interpolan estados; `disposeRig()` libera etiqueta, sprite y geometrías/materiales hijos.
- No añadas un `Mesh` por jugador con geometría única si puede compartirse.

## Viewmodel

`ToolView.ts` y `PickaxeModel.ts`:

- El pico usa geometría low-poly procedural fusionada por material y se renderiza en una escena/pass propio con luces locales (`MeshStandardMaterial`, `flatShading`). La linterna cercana no lo ilumina; por eso no se quema.
- Las demás armas conservan `MeshBasicMaterial` deliberados.
- `update(dt, moving, speed, time, jetpackActive)` anima respiración, sway, bob, fases del pico (anticipación → golpe → rebote → recuperación) y retroceso.
- El pico difiere su raycast al frame visual de impacto; no apliques daño al pulsar si quieres mantener partículas, audio y shake sincronizados.
- No devuelvas el pico al scene principal con materiales estándar sin revisar la presentación en superficie y bajo tierra.

## Partículas y efectos

`Effects.ts`:

- Pools de chispas, escombros, arcos, ondas, haces y polvo.
- `InstancedMesh`/`Points` con buffers reutilizados.
- Los `Math.random()` son visuales y locales; no afectan al mundo.
- `dispose()` libera geometrías, materiales y la textura de polvo.

## Estilo

- Exterior: pixel art, paleta terrosa/industrial, carteles con tipografía de sistema.
- Interior: low-poly orgánico, flat shading, colores por triángulo, iluminación de casco.
- La tolva exagera el llenado y el desborde para comunicar progreso.
- No añadas arte externo ni fuentes descargadas.
