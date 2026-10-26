# AGENTS.md — Carbon Magnate

Reglas para agentes que trabajen en este repositorio (Claude Code, Antigravity y otros).
La guía completa de arquitectura está en `CLAUDE.md`; el diseño y el estado del proyecto, en `plan.md`; la descripción de usuario, en `README.md`.

## Comandos de validación

```bash
npm install
npm run dev              # Vite en http://127.0.0.1:5173
npm run typecheck        # tsc --noEmit (strict, noUnusedLocals/Parameters)
npm run build:web        # typecheck + Vite build
npm run electron:dev     # Vite 5173 + Electron
npm run electron:preview # build web + Electron sobre dist/
npm run build:win        # build web + electron-builder portable
node scripts/sync-agent-skills.mjs   # replica .claude/skills en .agent/skills
# GitHub Pages: push a main → .github/workflows/deploy-pages.yml
# (base relativa ya configurada; ver README para habilitar Pages)
```

No hay test runner ni linter. La validación mínima es `npm run typecheck` y `npm run build:web`; para UI o red hay que ejecutar el juego y probar el flujo real. No afirmes que existen tests automáticos.

## Invariantes del proyecto

1. **Todo el arte y el audio son procedurales.** No añadas imágenes, modelos, fuentes ni sonidos externos. La única excepción son los iconos de aplicación (`public/favicon.svg`, `build/icon.svg`).
2. **La UI y los textos de juego están en español.** Mantén el tono corporativo/industrial y el formato de `src/ui/format.ts`.
3. **Mundo determinista.** La generación deriva de la semilla diaria y de `mulberry32`/hash de `src/core/Rng.ts`. No uses `Math.random()` en generación. El pozo es un **cubo macizo de 48 × 48 × 120 m**, sin túnel central ni cuevas naturales; todo hueco lo abre el jugador o la plantilla. Los `nodeId` incluyen el día y la colocación de minerales cambia con la semilla diaria.
4. **Orden de carga crítico:** `terrain.generate` → `resources.generate` → `applyCarveHistory` → `markBroken`/`setNodeHp`. Invertirlo desincroniza host y clientes.
5. **Nunca se envían mallas** ni posiciones de fragmentos. Viajan carves, IDs, `dropSeed`, estados agregados, depósitos y compras.
6. **Host autoritativo.** El host decide semilla, cuota, reloj, fin de día, plantilla, cofres y compras. Los clientes no llaman a `finishDay()`, no cierran el día y no escriben expediente.
7. **Carga personal hasta la tolva.** Recoger no acredita cuota/dinero; depositar con `E` junto a la tolva sí. Al cerrar el día, la carga pendiente se pierde.
8. **Jetpack bloqueado a nivel 0.** `maxJetpackFuel()` devuelve 0 y `Player` exige `maxFuel > 0`. Las escaleras son el retorno temprano.
9. **Empleados individuales.** Máximo 6; todo contrato nuevo es minero becario; ascenso y reconversión conservan el mismo `id`. El minero pica; el recolector no: vuela a por pepitas, carga hasta 20 kg y deposita al volver a la tolva.
10. **Contrato de UI por ID.** `UI.ts` y `Game.ts` exigen IDs de `index.html`. No renombres/elimines un ID sin actualizar el código.
11. **Protocolo y generación.** Si cambia la forma de un mensaje o la generación determinista (incluido el recuento/colocación de vetas), sube `PROTOCOL_VERSION` y `PEER_ID_PREFIX` (`carbon-magnate-v10-`), actualiza ambos lados, snapshots y documentación.
12. **Guardado versionado.** `carbon-magnate.save.v5`; lee v4/v3/v2 como migración; si cambia la estructura, crea una clave/migración nueva; no reinterpretes `v5`.
13. **Peso e inventario.** La carga es local y vive en una hotbar de 9 + 27 slots de almacenamiento (`Inventory.ts`), con un límite de peso (`maxCarryWeight`) ampliable con `capacity`. Al llenarse el peso o los slots no se recogen más piezas; el depósito vacía solo los minerales y conserva herramientas, escaleras y granadas.
14. **Granadas por tier.** No son un `WeaponId`. Son consumibles de `GRENADE_TIERS` con área común y distinto `carveStrength`/`maxLayer`; se compran, se mueven en el inventario y se lanzan desde la hotbar. El stock vive en `loadout.grenades` y se sincroniza con `grenade_use`/`economy`.
15. **Liquidación de turno.** El host calcula el cierre con `DaySettlement.buildDayReport()`: desglose por mineral, `oreValue` y bonus por rendimiento (`dayBonusFor`). Los minerales se abonan al depositar; el bonus se acredita al cerrar y se envía en `day_result.report`. El cliente solo muestra la liquidación; no la recalcula ni la cobra.
16. **Escaleras con anclaje.** Cada escalera es vertical u horizontal, necesita pared/suelo/otra escalera y no puede atravesar minerales. `G` muestra/oculta el fantasma (arranca oculto); `R` alterna escalera/puente. Las horizontales son puentes transitables; las colocadas no se guardan.
17. **Puntería de vetas.** El objetivo se valida con `Raycaster` contra la geometría instanciada real y oclusión de terreno; las esferas de silueta son solo broad-phase/asistencia. No aceptes vetas detrás de un muro ni vuelvas a un hitbox esférico único. El pico tiene alcance 5,0 m.
18. **Exterior natural y ciclo día-noche.** Sin skyline urbano ni vallas metálicas: montañas, bosque y rocas procedurales (`Landscape.ts`). `SkyCycle` usa un domo de shader con nubes procedurales, sol/luna y luces interpoladas con el progreso del turno: mañana al empezar y noche al terminar. Mantén el heightfield FBM de `Landscape`, no vuelvas a conos ni a un skyline urbano. No añadas assets externos.

## Skills

Antes de tocar un dominio, lee el `SKILL.md` correspondiente y ejecuta su auditoría. La copia canónica es `.claude/skills/`; `.agent/skills/` es el espejo para Antigravity.

| Skill | Úsala para | Auditoría |
|---|---|---|
| `world-determinism` | Terreno, recursos, semillas, IDs, zona segura, carves, late-join | `node .claude/skills/world-determinism/scripts/audit-world.mjs` |
| `coop-netcode` | Protocolo v10, snapshots, depósitos, escaleras, plantilla, compras | `node .claude/skills/coop-netcode/scripts/audit-netcode.mjs` |
| `balance-and-loop` | Cuotas, armas, mejoras, jetpack, escaleras, empleados, bucle de tolva | `node .claude/skills/balance-and-loop/scripts/audit-balance.mjs` |
| `hud-and-shop` | HUD, overlays, menús, tienda, pixel mode, IDs | `node .claude/skills/hud-and-shop/scripts/audit-ui.mjs` |
| `procedural-content` | Geometría, texturas canvas, materiales, instancing, dispose | `node .claude/skills/procedural-content/scripts/audit-assets.mjs` |
| `procedural-audio` | WebAudio, mute, panner, loops, inicialización por gesto | `node .claude/skills/procedural-audio/scripts/audit-audio.mjs` |
| `desktop-packaging` | Electron `carbon://`, seguridad, Vite, portable | `node .claude/skills/desktop-packaging/scripts/audit-electron.mjs` |
| `save-and-roster` | localStorage v5, migración v4/v3/v2, loadout, roster | `node .claude/skills/save-and-roster/scripts/audit-save.mjs` |
| `token-economy` | Presupuestos de contexto, duplicación documental, modularización segura | `node .claude/skills/token-economy/scripts/audit-context.mjs` |

## Flujo de trabajo

1. Lee `CLAUDE.md`, `plan.md` y el skill del dominio.
2. Comprueba `git status` y no toques artefactos (`dist/`, `release/`, `node_modules/`).
3. Define el cambio y su validación; si es una decisión de producto, propón una opción y declara la suposición.
4. Implementa en la capa correcta; no disperses números de balance fuera de `src/config.ts`.
5. Ejecuta la auditoría del skill y `npm run typecheck`.
6. Prueba el flujo real: `npm run dev` y, si toca red/escritorio, dos ventanas/`npm run electron:preview`.
7. Actualiza `plan.md`/`CLAUDE.md` si cambia arquitectura, balance, protocolo o limitaciones.
8. Si editas `.claude/skills/`, ejecuta `node scripts/sync-agent-skills.mjs` para actualizar `.agent/skills/`.

## Reglas de seguridad y alcance

- No instales dependencias nuevas sin aprobación.
- No edites `dist/`, `release/`, lockfiles ni binarios a mano.
- No borres expedientes ni datos del usuario sin migración explícita.
- Mantén el runtime 100 % compatible con navegador; Electron es una capa de empaquetado, no una dependencia del juego.
- Si una instrucción del usuario contradice las invariantes, señala el conflicto antes de implementar.
