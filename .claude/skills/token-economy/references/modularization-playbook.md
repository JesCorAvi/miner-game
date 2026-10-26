# Playbook de modularización

## Estado final (2026-10-25)

La extracción se aplicó. Tamaños actuales; la auditoría es la fuente de verdad:

| Archivo | Líneas |
|---|---|
| `src/core/Game.ts` | ≈636 |
| `src/core/Combat.ts` | ≈683 |
| `src/core/DayCycle.ts` | ≈350 |
| `src/core/NetworkBridge.ts` | ≈296 |
| `src/core/NetworkMessages.ts` | ≈252 |
| `src/core/Interaction.ts` | ≈420 |
| `src/core/Session.ts` | ≈318 |
| `src/core/Hud.ts` | ≈185 |
| `src/core/View.ts` | ≈73 |
| `src/core/Shop.ts` | 227 |
| `src/core/ShopView.ts` | 72 |
| `src/core/RunState.ts` | 60 |
| `src/core/GameTypes.ts` | 20 |
| `src/core/GameConstants.ts` | 9 |
| `src/ui/UI.ts` | ≈860 |
| `src/ui/shopView.ts` | 102 |
| `src/network/Protocol.ts` | ≈859 |
| `src/player/Player.ts` | ≈788 |
| `src/world/Environment.ts` | ≈751 |
| `src/world/Resources.ts` | ≈644 |
| `src/styles/hud.css` | ≈870 |
| `index.html` | 465 |

Todos los TS están por debajo de 900, el CSS por debajo de 1.200 y el HTML por debajo de 600. Los siguientes archivos que más se acercan al límite son `Protocol.ts`, `UI.ts`, `Player.ts` y `Environment.ts`.

## Arquitectura actual

```
src/core/
  Game.ts              composición, estado, bucle, render y delegadores
  DayCycle.ts          inicio/carga/fin de día, siguiente día, guardado
  Combat.ts            armas, proyectiles, nodos, carves y FX
  Interaction.ts       tolva, carga, escaleras, prompt
  NetworkBridge.ts     callbacks, snapshot, ticks y desconexión
  NetworkMessages.ts   handlers host/cliente
  Shop.ts              catálogo y compra puros sobre RunSnapshot
  ShopView.ts          vista de tienda y efectos de compra
  Hud.ts               HudViewData, aim y objetivo
  View.ts              cámara, pixel mode y resolución
  Session.ts           menú, lobby, controles y sesión
  RunState.ts          helpers de RunSnapshot/loadout
  GameTypes.ts         tipos internos
  GameConstants.ts     constantes del bucle y de red
```

`Game` es la **composition root**: posee el estado y el bucle, y delega en módulos. Los módulos importan `type { Game }` (sin ciclo en runtime) y acceden a los campos públicos del orquestador.

## Qué se extrajo y por qué

| Módulo | Responsabilidad | Riesgo |
|---|---|---|
| `Shop.ts` / `ShopView.ts` | Catálogo/compra pura y efectos de compra | Bajo |
| `Hud.ts` | View data, aim y objetivo | Bajo |
| `View.ts` | Cámara, pixel mode y resolución | Bajo |
| `Session.ts` | Menú, lobby, controles y sesión | Medio |
| `Interaction.ts` | Tolva, carga, escaleras y prompt | Medio |
| `Combat.ts` | Armas, proyectiles, nodos, carves y FX | Medio |
| `DayCycle.ts` | Día, snapshot, fin de día y guardado | Alto |
| `NetworkBridge.ts` / `NetworkMessages.ts` | Red, snapshots, ticks y mensajes | Alto |

Las extracciones de mayor riesgo (`DayCycle`, `NetworkBridge`) se hicieron preservando firmas y delegadores en `Game`. No cambian protocolo ni balance.

## Procedimiento para una extracción futura

1. **Elige un dominio con frontera nombrable.** No extraigas por número de líneas.
2. **Escribe el contrato** en 10–15 líneas: responsabilidad, entradas, salidas, dependencias.
3. **Crea el módulo como funciones** que reciben `game: Game`; evita clases con estado duplicado.
4. **Mueve un método cada vez.** Si es puro, muévelo primero; si toca estado, deja un delegado en `Game`.
5. **Conserva firmas y orden de llamadas** durante la transición.
6. **Ejecuta `npm run typecheck`.**
7. **Ejecuta la auditoría del dominio** (mundo, red, balance, UI, audio, guardado) y `audit-context.mjs`.
8. **Prueba el flujo real**: menú → partida → tolva → tienda → siguiente día.
9. **Actualiza `CLAUDE.md`, `plan.md`, `README.md` y las skills** con las rutas nuevas.
10. **Commit separado** solo con la extracción; sin balance, protocolo ni UI.

## Reglas

- **Sin cambios de comportamiento** en el commit de extracción.
- **Sin cambios de protocolo** en el commit de extracción.
- **Sin dependencias nuevas.**
- **Sin ciclos de import en runtime.** Los módulos usan `import type { Game }`; `Game` importa los módulos.
- **Game no se importa como valor desde un módulo.** Solo como tipo.
- **No extraigas propiedad de estado** (`run`, `seed`, `carveHistory`, `cargoCoal`) a otro contenedor; sigue viviendo en `Game`. La excepción consolidada es `Inventory`: gestiona sus slots y `Game` sincroniza los agregados de carga.
- **No crees barrels** que reexporten todo; importa del módulo real.
- **No partas un método de 30 líneas** solo para cumplir un número.
- **Mantén el contrato de IDs** y el orden de `loadSnapshot` aunque cambie el archivo.

## CSS

`src/style.css` es ahora un punto de entrada con `@import`:

```
src/styles/
  base.css          variables, reset, tipografía, utilidades
  primitives.css    primitivas compartidas
  hud.css           HUD, mira, avisos, banner
  menu.css          menú, lobby, pausa, game over, red
  shop.css          oficina nocturna y tarjetas
  responsive.css    media queries
```

- El orden de importación es fijo: base → primitives → hud → menu → shop → responsive.
- Conserva la cascada; no muevas selectores que dependan del orden sin comprobarlo visualmente.
- Mantén los IDs; el contrato con `UI.ts` no cambia.

## HTML

`index.html` tiene 464 líneas y muchos IDs. Divídelo solo si una sección es claramente independiente (por ejemplo, un `<template>` de tienda). Mientras sea una sola página, es aceptable; lo importante es que los IDs sigan siendo únicos y referenciados.

## Medición

```bash
node .claude/skills/token-economy/scripts/audit-context.mjs
npm run typecheck
npm run build:web
```

- Compara líneas por archivo y el top de la auditoría.
- Compara `dist/assets/*.js` si el objetivo es bundle. **Modularizar no reduce el bundle por sí solo**; para eso usa `manualChunks`, import dinámico de PeerJS/Three o elimina código.
- Si el bundle crece, revisa imports cruzados y barrels.

## Anti-patrones

- Extraer un módulo que importa `Game` como valor y crea un ciclo.
- Mover estado y comportamiento en el mismo paso.
- Refactorizar `DayCycle` y `NetworkBridge` a la vez.
- Cambiar nombres de métodos públicos sin actualizar llamadas y auditorías.
- Crear 20 archivos de 50 líneas.
- Duplicar `Game` como fachada y como implementación.
- Aprovechar la extracción para “limpiar” balance o protocolo.
- Olvidar actualizar las auditorías cuando cambia la ubicación de un método.
