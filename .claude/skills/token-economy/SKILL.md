---
name: token-economy
description: "Reduce el coste de contexto del repositorio: presupuestos de tamaño, documentación sin duplicación, lectura dirigida y modularización segura de Carbon Magnate. Úsala antes de añadir módulos, documentos o skills, o al planificar un refactor."
---

# Token Economy

## Overview

Carbon Magnate se mantiene con agentes que leen y editan el repositorio. El coste dominante no es el tamaño del bundle, sino **cuánto contexto hay que cargar para entender un cambio**. Tras la modularización, `Game.ts` ronda las 830 líneas, el CSS se reparte en `src/styles/*.css` (máximo ≈1.080) y `UI.ts` queda en ≈870; la hotbar/inventario vive en `InventoryView.ts`/`Inventory.ts` y los iconos en `MineralIcon.ts`/`ItemIcon.ts`. El riesgo futuro está en `Protocol.ts` (~890), `Player.ts` (~830), `Combat.ts` (~815) y `Game.ts`.

La regla de diseño es **contexto bajo demanda**: lo que se carga siempre debe ser un mapa corto; el detalle vive en referencias que se leen solo cuando hacen falta.

## When to Use

- Antes de añadir un módulo, una referencia, una skill o una sección larga a `CLAUDE.md`.
- Al revisar los archivos que se acercan al presupuesto (`Protocol.ts`, `UI.ts`, `Player.ts`, `Environment.ts`) o al planificar una nueva extracción.
- Cuando una sesión gasta demasiado contexto leyendo archivos completos.
- Cuando dos documentos repiten la misma tabla o el mismo procedimiento.
- Al revisar si una skill nueva está justificada o si basta con una sección en otra.

## When Not to Use

- Para ajustar balance, red o mundo: usa la skill del dominio.
- Para reducir el bundle de producción: eso es code splitting/tree-shaking, no modularización por sí sola (ver `desktop-packaging`).
- Para reescribir documentación sin un objetivo medible.

## Mandatory Workflow

1. **Mide.** `node .claude/skills/token-economy/scripts/audit-context.mjs`.
2. **Clasifica.** Documento auto-cargado, documento bajo demanda, módulo de código, skill o auditoría.
3. **Busca antes de leer.** `rg`/Glob para localizar; después `Read` con `offset`/`limit`. No leas archivos de 2.000 líneas completos.
4. **Aplica el presupuesto.** Si un archivo supera el umbral, divide por dominio antes de añadir más.
5. **Mueve detalle, no lo copies.** `CLAUDE.md` enlaza; las referencias de skill contienen el contrato.
6. **Modulariza sin cambiar comportamiento.** Una extracción por cambio, con `typecheck` y prueba manual.
7. **Actualiza índices.** `CLAUDE.md`/`AGENTS.md` deben listar la skill y su auditoría.
8. **Vuelve a medir.** Ejecuta la auditoría y `npm run typecheck`.

**Condición de parada:** si el cambio exige una decisión de producto (¿merece la pena refactorizar ahora?), propone la opción de menor riesgo y declara la suposición. No preguntes por umbrales que ya están en esta skill.

## Budget Table

| Superficie | Objetivo | Aviso |
|---|---|---|
| `CLAUDE.md` (auto-cargado) | ≤ 400 líneas | 450 |
| `AGENTS.md` | ≤ 120 líneas | 250 |
| `plan.md` (bajo demanda) | ≤ 600 líneas | 700 |
| `README.md` | ≤ 200 líneas | 250 |
| `SKILL.md` | ≤ 140 líneas | 160 |
| Referencia de skill | ≤ 200 líneas | 240 |
| Módulo TS | 300–800 líneas | 900 |
| `src/style.css` | ≤ 1.000 líneas | 1.200 |
| `index.html` | ≤ 500 líneas | 600 |
| Salida de auditoría | ≤ 40 líneas | — |

Los umbrales son señales, no fallos. La extracción de 2026-10-25 dejó todos los archivos dentro del presupuesto; el objetivo ahora es **no volver a superarlo** y dividir antes de añadir otro bloque grande.

## Documentation Layering

| Documento | Público | Qué contiene | Qué no contiene |
|---|---|---|---|
| `README.md` | Usuario | Características, controles, instalación, multijugador | Arquitectura interna detallada |
| `plan.md` | Mantenedor/agente | Estado, decisiones, deuda técnica, roadmap | Procedimientos operativos repetidos |
| `CLAUDE.md` | Claude Code (siempre) | Mapa, comandos, invariantes críticas, tabla de skills | Tablas largas, tutoriales, detalles de implementación |
| `AGENTS.md` | Antigravity/otros (siempre) | Reglas globales y validación | Copia completa de `CLAUDE.md` |
| `SKILL.md` | Agente al invocar | Flujo de trabajo, reglas, validación | Contratos extensos, datos de balance |
| `references/*.md` | Agente bajo demanda | DTOs, tablas, fórmulas, casos límite | Introducciones y motivación |
| Comentarios de código | Quien lee el módulo | Por qué no es obvio | Lo que el código ya dice |

## Token-Efficient Workflow

- **Localiza con `rg`**, no con lecturas completas: `rg -n "depositCargo|applyTeamDeposit" src`.
- **Lee por rango**: `Read` con `offset`/`limit` alrededor del símbolo.
- **Usa las auditorías** para comprobar invariantes sin abrir el orquestador completo.
- **No leas artefactos**: `dist/`, `release/`, `node_modules/`, lockfiles (`.claude/settings.json` ya los deniega).
- **No pegues archivos completos** en documentos; enlaza y resume.
- **Resume la salida**: la auditoría imprime lo esencial; no vuelques el informe entero en la conversación.
- **Una pregunta concreta** (“¿cómo fluye un depósito?”) debe resolverse con 3–5 lecturas dirigidas, no con 10 archivos completos.

## Modularization Policy

- **Frontera por dominio, no por número de líneas.** Un módulo debe tener una responsabilidad nombrable.
- **Extrae primero lo puro.** La primera extracción ya está hecha: `Shop`/`ShopView`, `DayCycle`, `Combat`, `Interaction`, `NetworkBridge`/`NetworkMessages`, `Hud`, `View` y `Session`. Si un módulo vuelve a crecer, aplica el mismo patrón antes de añadir código.
- **Game como fachada.** Durante la extracción, `Game` conserva métodos delegados; no cambies llamadas externas a la vez.
- **Dirección de dependencias:** `config`/`types` → `Rng` → `world` → `player`/`entities` → `network` → `ui` → `Game`. Un servicio extraído no debe importar `Game`; recibe callbacks o interfaces.
- **Sin ciclos de imports.** Si una extracción crea un ciclo, el límite está mal elegido.
- **Sin cambios de comportamiento ni de protocolo** en el mismo commit que la extracción.
- **Una extracción por cambio.** Después: `npm run typecheck`, `npm run build:web` y prueba manual del flujo afectado.
- **No extraigas propiedad de estado** (run, seed, cargo) hasta que el comportamiento esté separado y probado.
- **Rango sano:** 300–800 líneas por módulo; evita archivos de 50 líneas y barrels que reexportan todo.
- **CSS/HTML:** divide por superficie (`base`, `hud`, `menu`, `shop`, `environment`) preservando el orden de cascada y el contrato de IDs.

## Anti-Patterns

- Crear una skill por cada idea: cada descripción se carga siempre y compite por atención.
- Duplicar tablas de cuotas, controles o arquitectura en 3 documentos.
- Un `CLAUDE.md` que sea un manual completo en lugar de un mapa.
- Leer `Game.ts` entero para cambiar un precio.
- Partir código en módulos de 40 líneas con boilerplate.
- Refactorizar y cambiar balance/protocolo en el mismo commit.
- Confundir modularizar con reducir el bundle.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-context.mjs` sin errores; tablas de skills consistentes; `.agent/skills` es espejo.
- **Nivel 1 — Tipos:** `npm run typecheck`.
- **Nivel 2 — Build:** `npm run build:web`.
- **Nivel 3 — Flujo manual:** menú → partida → tolva → tienda → siguiente día, si se tocó código.
- **Nivel 4 — Red/escritorio:** dos ventanas y/o `npm run electron:preview`, si el cambio los afecta.

**Reporta el nivel alcanzado, el antes/después de líneas y si el bundle cambió o no.**

## Output Expectations

- Diagnóstico: archivos que superan presupuesto y duplicación relevante.
- Cambio propuesto: mover, enlazar, dividir o no tocar.
- Archivos tocados y métricas antes/después (`wc -l`, auditoría, `dist/assets` si aplica).
- Resultado de `audit-context.mjs` y `typecheck`.
- Riesgo de regresión y validación manual realizada.

## References

- `references/context-hygiene.md` — capas documentales, duplicación, autoría de skills y lectura dirigida.
- `references/modularization-playbook.md` — estado final de la modularización, extracción segura de `Game.ts`, CSS y HTML, y validación.

## Related Skills

- `world-determinism`, `coop-netcode`, `balance-and-loop`, `hud-and-shop`, `procedural-content`, `procedural-audio`, `desktop-packaging`, `save-and-roster` — contratos que la modularización debe preservar.
