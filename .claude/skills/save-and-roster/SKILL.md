---
name: save-and-roster
description: "Persistencia local v5 y plantilla individual de Carbon Magnate: migración v4/v3/v2, loadout, escaleras, granadas, jetpack, capacidad y roster. Úsala al cambiar SaveManager, SaveData o el guardado de partida."
---

# Save and Roster

## Overview

El expediente de Carbon Magnate vive en `localStorage` con la clave `carbon-magnate.save.v5`. Guarda día, dinero, modo infinito, loadout completo (armas, mejoras —incluida capacidad—, pasivas, escaleras, granadas y roster individual), estadísticas y nombre. La clave `carbon-magnate.name` conserva el nombre del operario como preferencia. Las claves v4, v3 y v2 se leen como migración y se eliminan al guardar.

Los clientes online no escriben expediente; solo el host/solo guarda. `SaveManager.normalizeLoadout()` y `normalizeEmployees()` toleran datos corruptos, campos ausentes y el formato antiguo de contadores (`miners`/`collectors`).

## When to Use

- Cambiar `src/save/SaveManager.ts`, `SaveData` o `Loadout`.
- Añadir un campo persistente (arma, mejora, pasiva, escalera, empleado, estadística).
- Cambiar cuándo se guarda o se borra el expediente.
- Migrar una clave o versión anterior.
- Tocar el roster individual, `nextId`, rangos o reconversión.
- Depurar "continuar" que no restaura el loadout.

## When Not to Use

- Cambiar el formato de red: usa `coop-netcode`.
- Ajustar precios, cuotas o balance: usa `balance-and-loop`.
- Cambiar cómo se muestran los datos: usa `hud-and-shop`.
- Cambiar la persistencia de ajustes visuales/audio (no existe una tienda de ajustes): consulta `hud-and-shop`.

## Mandatory Workflow

1. **Decide si cambia el esquema.** Si cambia la forma de `SaveData`, no reutilices `v5`.
2. **Actualiza los tipos.** `src/types.ts` (`SaveData`, `Loadout`, `EmployeeRecord`, `RunStats`).
3. **Actualiza el default.** `makeDefaultLoadout()` en `config.ts`.
4. **Normaliza la lectura.** `normalizeLoadout`, `normalizeEmployees`, `normalizeStats`; cotas y fallbacks.
5. **Actualiza el guardado.** `DayCycle.saveRun()` y los disparadores (día, 12 s, visibilidad, compra, fin de día).
6. **Actualiza el resumen del menú.** `SaveManager.summary()` y `UI.showMenu()`.
7. **Audita.** `node .claude/skills/save-and-roster/scripts/audit-save.mjs`.
8. **Prueba.** Nueva operación → jugar → comprar → cerrar/recargar → continuar; y fallar un día para verificar el borrado.

**Condición de parada:** si el cambio exige una decisión de producto (pérdida de expedientes frente a migración), propone migración explícita y declara la suposición. No reutilices una clave existente para una forma nueva.

## Source Table

| Sistema | Archivo | Export / método |
|---|---|---|
| Claves y versión | `src/config.ts`, `SaveManager.ts` | `SAVE_KEY`, `NAME_KEY`, `LEGACY_SAVE_KEY`, `SAVE_VERSION` |
| Tipo de expediente | `src/types.ts` | `SaveData`, `SaveSummary`, `Loadout`, `EmployeeRecord`, `RunStats` |
| Normalización | `src/save/SaveManager.ts` | `normalizeLoadout`, `normalizeEmployees`, `normalizeStats` |
| Persistencia | `src/save/SaveManager.ts` | `load`, `save`, `summary`, `clear`, `loadName`, `saveName` |
| Disparadores | `src/core/Game.ts`, `DayCycle.ts`, `GameConstants.ts` | `visibilityHandler`/`pageHideHandler` en Game; `saveRun`, `finishDay`, `startNextDay` en DayCycle; `AUTOSAVE_INTERVAL` en GameConstants |
| Compra y guardado | `src/core/ShopView.ts` | `applyPurchase` → `DayCycle.saveRun` |
| Plantilla | `src/entities/Staff.ts`, `src/config.ts` | `configure`, `spawnEntities`, `EMPLOYEE_RANKS`, `hireCost`, `rankCost` |

## Decision Table

| Cambio | Archivo(s) | Verifica |
|---|---|---|
| Nuevo campo del loadout | `types.Loadout`, `makeDefaultLoadout`, `normalizeLoadout`, `Game`, UI/tienda | Se guarda, se restaura y tiene default |
| Nueva arma/mejora/pasiva | `config.ts` + normalización + `Game` | Arranca bloqueada/0 si es nueva; máximos respetados |
| Nuevo campo del expediente | `types.SaveData`, `saveRun`, `load`, `summary` | Versión/migración y resumen del menú |
| Nuevo dato de empleado | `EmployeeRecord`, `normalizeEmployees`, `Staff`, `NetworkStaffState` | `id`, `kind`, `rank` y `nextId` estables |
| Nueva clave/versión | `SAVE_KEY`, `LEGACY_SAVE_KEYS`, `version` | No reinterpretar `v5`; migración explícita |
| Nuevo disparador de guardado | `DayCycle.saveRun()` | No guardar en `menu`, `lobby`, `gameover` ni como cliente |
| Cambio de resumen | `SaveManager.summary()` + UI | Día, dinero, fecha y días completados |

## Non-Negotiable Rules

- **Clave única v5.** `carbon-magnate.save.v5`; el nombre en `carbon-magnate.name`; las claves v4, v3 y v2 se leen y se eliminan al guardar.
- **No reinterpretar v5.** Si cambia la forma, crea una clave/versión nueva o una migración explícita. No reutilices `v5` para otra estructura.
- **Un solo propietario.** Solo `SaveManager` toca `localStorage`.
- **Clientes no guardan.** `DayCycle.saveRun()` rechaza `role === 'client'`, fases `menu`, `lobby` y `gameover`.
- **Guardado automático.** Al iniciar cada día, cada 12 s, al ocultar/cerrar la pestaña, al comprar y al terminar un día con éxito.
- **Éxito guarda el día siguiente.** En la tienda, `DayCycle.saveRun()` persiste `day + 1`; el fracaso llama a `saves.clear()`.
- **La carga personal no se guarda.** El inventario de slots es local y se pierde al cerrar el turno; no lo añadas al expediente. El `dayReport` de la liquidación es transitorio: se calcula en el host al cerrar y se transmite en `day_result`, pero no se persiste.
- **Roster individual.** Máximo 6 registros con `id`, `kind`, `rank`. Todo contrato nuevo es minero becario; ascenso y reconversión conservan el `id` y el rango.
- **`nextId` avanza.** Cada contratación consume `nextId`; al normalizar, `nextId` debe superar el mayor `emp-N` existente.
- **Normalización defensiva.** JSON inválido, almacenamiento bloqueado o campos corruptos no deben romper el arranque; usa fallbacks y cotas.
- **El nombre sobrevive al borrado.** `clear()` borra el expediente, no la preferencia de nombre.
- **Resumen del menú.** `summary()` devuelve día, dinero, `savedAt` y días completados; el menú debe poder continuar.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-save.mjs` sin errores; claves, versión, normalización y roster intactos.
- **Nivel 1 — Guardar/continuar:** nueva operación, jugar, recargar y continuar con el mismo loadout, dinero y día.
- **Nivel 2 — Compra:** comprar arma/mejora/escalera/empleado y recargar; todo persiste una sola vez.
- **Nivel 3 — Día y fracaso:** terminar un día con éxito guarda el siguiente; fallar borra el expediente; el nombre persiste.
- **Nivel 4 — Migración y co-op:** cargar un guardado v4 sin `grenades`, uno v3 sin `capacity` o uno v2 con `miners`/`collectors`; comprobar que las granadas arrancan a 0 y las mejoras a su valor válido; un cliente online no escribe expediente.

**Reporta el nivel alcanzado y qué migración o escenario de cierre no se pudo probar.**

## Output Expectations

- Esquema y versión modificados (o confirmación de que no cambian).
- Archivos tocados y campos añadidos/eliminados.
- Estrategia de normalización/migración.
- Resultado de `audit-save.mjs`.
- Niveles de validación alcanzados y riesgos de pérdida de expediente.

## References

- `references/save-v5-and-roster.md` — claves, esquema, normalización, disparadores, migración v4/v3/v2 y roster.

## Related Skills

- `balance-and-loop` — loadout, precios y progresión que se persiste.
- `coop-netcode` — plantilla replicada y ausencia de guardado en clientes.
- `hud-and-shop` — resumen del menú y visualización de la plantilla.
- `world-determinism` — día y semilla que se restauran al continuar.
