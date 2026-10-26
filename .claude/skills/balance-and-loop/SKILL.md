---
name: balance-and-loop
description: "Ajusta cuotas, economía, armas, mejoras, capacidad de mochila, jetpack, escaleras y plantilla, y valida el bucle mochila→tolva→tienda de Carbon Magnate. Úsala al cambiar números o reglas de juego."
---

# Balance and Loop

## Overview

Carbon Magnate se sostiene sobre un bucle corto: minar, llenar la mochila, **volver a la tolva**, depositar y reinvertir en la oficina nocturna. La recogida no acredita nada; el depósito sí. La mochila tiene un límite de peso ampliable, el jetpack es una compra tardía y las escaleras son la herramienta barata de retorno.

Todo el balance numérico vive en `src/config.ts`. `DayCycle.ts`, `DaySettlement.ts`, `Interaction.ts` y `ShopView.ts` orquestan el día, el cierre, la tolva y la tienda; `Game.ts` compone y delega; `Player.ts` aplica el jetpack; `Staff.ts` consume el roster individual.

## When to Use

- Cambiar cuotas, duración del día, precios, recompensas o multiplicadores.
- Añadir o ajustar un arma, mejora, pasiva, cofre, escalera o rango de empleado.
- Cambiar el bucle de carga/tolva, la condición de éxito o la tienda.
- Revisar por qué una mejora "no hace nada" o un empleado no aparece.
- Ajustar la progresión de victoria, modo infinito o guardado del día.

## When Not to Use

- Cambiar mensajes, snapshots o autoridad de red: usa `coop-netcode`.
- Cambiar terreno, semillas o IDs: usa `world-determinism`.
- Cambiar HUD o presentación de la tienda: usa `hud-and-shop`.
- Cambiar modelos, texturas o sonidos: usa `procedural-content` o `procedural-audio`.

## Mandatory Workflow

1. **Define el objetivo medible.** "Que el día 4 exija dos viajes" es válido; "que sea más divertido" no.
2. **Localiza la capa.** Usa la tabla de fuentes; no disperses números por los módulos de dominio si pertenecen a `config.ts`.
3. **Comprueba las invariantes.** Mochila local con límite de peso, depósito autoritativo, jetpack bloqueado a nivel 0, roster individual.
4. **Edita la configuración.** Mantén la forma de `Loadout`, `MINERALS`, `WEAPONS`, `UPGRADES`, `EMPLOYEES` y `QUOTAS`.
5. **Actualiza la tienda y el guardado si cambia la forma del loadout.**
6. **Ejecuta la auditoría.** `node .claude/skills/balance-and-loop/scripts/audit-balance.mjs`.
7. **Prueba el flujo real.** Menú → día → picar → recoger → volver → depositar → fin de día → tienda → siguiente día.

**Condición de parada:** si el objetivo exige una decisión de producto (subir la dificultad global frente a un solo día), propone la opción menos invasiva y declara la suposición. No preguntes por valores que ya existen en `config.ts`.

## Source Table

| Sistema | Archivo | Export / método |
|---|---|---|
| Cuotas y tiempo | `src/config.ts` | `QUOTAS`, `baseQuotaForDay`, `quotaForDay`, `dayDuration`, `VICTORY_DAY` |
| Minerales | `src/config.ts` | `MINERALS`, `LAYERS` |
| Armas | `src/config.ts` | `WEAPONS`, `WEAPON_ORDER` |
| Mejoras y pasivas | `src/config.ts` | `UPGRADES`, `PASSIVES`, `damageMultiplier`, `cooldownMultiplier`, `carveRadiusMultiplier`, `magnetRadius`, `maxJetpackFuel`, `maxCarryWeight` |
| Escaleras | `src/config.ts` | `STARTING_LADDERS`, `LADDER_PACK_SIZE`, `LADDER_COST`, `LADDER_HEIGHT`, `LADDER_REACH` |
| Plantilla | `src/config.ts` / `src/entities/Staff.ts` | `EMPLOYEE_LABELS`, `EMPLOYEE_RANKS`, `hireCost`, `rankCost`, `employeeRankMultiplier`, `StaffManager` |
| Catálogo y compras | `src/core/Shop.ts` | `buildShopItems`, `applyPurchaseToRun` |
| Día y guardado | `src/core/DayCycle.ts` | `beginAuthorityDay`, `loadSnapshot`, `finishDay`, `startNextDay`, `saveRun` |
| Carga y tolva | `src/core/Interaction.ts` | `onLootCollected`, `depositCargo`, `applyTeamDeposit`, `discardCargo` |
| Escaleras | `src/core/Interaction.ts` | `findLadderPlacement`, `placeLadder`, `nextLadderId` |
| Tienda y efectos | `src/core/ShopView.ts` | `buildShopView`, `requestPurchase`, `applyPurchase`, `broadcastShopState` |
| Cierre y bonus | `src/core/DaySettlement.ts`, `src/config.ts` | `buildDayReport`, `recordDeposit`, `dayBonusFor`, `DAY_BONUS_*` |
| Jetpack | `src/player/Player.ts` | `setLoadout`, `maxFuel > 0`, `isJetpackActive` |
| Guardado | `src/save/SaveManager.ts` | `normalizeLoadout`, `normalizeEmployees` |

## Decision Table

| Quieres cambiar… | Toca… | Verifica… |
|---|---|---|
| Cuota de un día | `QUOTAS` en `config.ts` | Día 15 sigue siendo 40.000 y el escalado post-15 usa 1,38 |
| Cuota cooperativa | `quotaForDay` | `1 + 0,6 × (jugadores - 1)`, fijada al inicio del día |
| Duración del turno | `BASE_DAY_TIME`, `DAY_TIME_PER_LEVEL` | 90 s base, +15 s/nivel, máximo 5 niveles |
| Valor de un mineral | `MINERALS[].carbonYield` o `moneyYield` | Carbón → cuota + dinero; mineral/gema → dinero; pelletCount > 0 |
| HP de un nodo | `MINERALS[].hp` y `scale` | La dureza de capa reduce el carve, no el hp |
| Arma | `WEAPONS[id]` y `WEAPON_ORDER` | `unlockCost`, estilo, radio y cooldown consumidos en `Combat.fire*` |
| Mejora | `UPGRADES[id]` | `baseCost`, `growth`, `max` y su multiplicador real |
| Jetpack | `UPGRADES.jetpack` + `maxJetpackFuel` | Nivel 0 → 0 combustible; nivel 1 → 100; +20/nivel |
| Capacidad de carga | `UPGRADES.capacity` + `maxCarryWeight` | Base 40 kg + 20 kg/nivel; el peso y los 36 slots (9 hotbar + 27) se llenan con fragmentos |
| Pasiva de cofre | `PASSIVES` + `CHEST_REWARDS` | La clave debe consumirse en `config.ts`, `Combat.ts` o `Interaction.ts` |
| Escaleras | `LADDER_*` | Pack de 4 por 30; stock de equipo; colocadas se limpian al día |
| Empleado | `EMPLOYEE_LABELS`, `EMPLOYEE_RANKS`, `HIRE_GROWTH` | Máximo 6; nuevo contrato = minero becario; id estable |
| Tienda | `buildShopItems`/`applyPurchaseToRun` en `Shop.ts` + `buildShopView` en `ShopView.ts` | Pestañas Empleados → Equipo → Mejoras → Inventario; Equipo agrupa armas, escaleras y granadas |
| Bonus de cierre | `DAY_BONUS_BASE`, `DAY_BONUS_DAY_STEP`, `dayBonusFor` | Base 150 + 50/día; hasta x2 por excedente de cuota; solo en éxito |
| Victoria / infinito | `VICTORY_DAY` y `DayCycle.startNextDay` | Día 15 abre victoria; el host puede continuar |

## Non-Negotiable Rules

- **Recoger no acredita.** `onLootCollected()` apila el fragmento en `Inventory` y sincroniza `cargoCoal`/`cargoMoney`/`cargoWeight`; `applyTeamDeposit()` suma a cuota, dinero y estadísticas. Si el peso supera `maxCarryWeight` o no hay slot/stack libre, la pieza no se recoge.
- **La tolva es obligatoria.** `depositCargo()` exige `isNearHopper()` y `E`; al cerrar el día, `discardCargo()` pierde la mochila.
- **Cuota fija del día.** Se calcula al empezar el día con el número de jugadores; un late-join no la modifica.
- **15 días.** `VICTORY_DAY = 15`; tras la victoria el host puede activar modo infinito con cuotas ×1,38.
- **Jetpack bloqueado a nivel 0.** `maxJetpackFuel()` devuelve 0 y `Player` exige `maxFuel > 0`; la HUD muestra el bloqueo.
- **Escaleras baratas y consumibles.** 8 iniciales, packs de 4 por 30; el stock es de equipo y persiste; las colocadas no.
- **Plantilla individual.** Máximo 6 registros con `id`, `kind` y `rank`. Todo contrato nuevo es minero becario (`rank: 0`); ascenso y reconversión conservan el `id`.
- **Recolector logístico.** No pica ni recoge en área: vuela hasta cada pepita, carga como máximo `COLLECTOR_CARRY_WEIGHT` (20 kg, media mochila inicial) y deposita al llegar a la tolva. Picar terreno normal no suelta loot.
- **Tienda autoritativa.** El cliente solo envía `purchase`; `ShopView.applyPurchase()` valida con `applyPurchaseToRun()`, descuenta y difunde el estado en el host.
- **Cierre y bonus.** Al cubrir cuota, `finishDay()` calcula el desglose con `DaySettlement.buildDayReport()`, acredita el bonus de rendimiento en el host y muestra la liquidación; después se abre la tienda. El fracaso no paga bonus y borra el expediente.
- **Nada de números mágicos.** Si un valor afecta a la economía, al combate o a la progresión, debe vivir en `config.ts`.
- **Sin dependencias nuevas** para ajustar números.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-balance.mjs` sin errores; cuotas, armas, minerales y rangos coherentes.
- **Nivel 1 — Día:** el reloj, la cuota y la regeneración del pozo funcionan; recoger no cambia la cuota.
- **Nivel 2 — Tolva y cierre:** el depósito suma carbón/dinero, la tolva crece, la liquidación desglosa minerales y bonus, y la carga pendiente se pierde al cerrar.
- **Nivel 3 — Tienda:** compra de arma/mejora/escalera/empleado, ascenso y reconversión; el dinero se descuenta una vez.
- **Nivel 4 — Progresión:** victoria del día 15, modo infinito, game over y guardado/continuación.

**Reporta el nivel alcanzado y el escenario concreto (día, arma, empleado) que no se haya probado.**

## Output Expectations

- Objetivo y suposición de diseño.
- Constantes modificadas con valores antes/después.
- Archivos tocados y su efecto en tienda, HUD o guardado.
- Resultado de `audit-balance.mjs`.
- Niveles de validación alcanzados y riesgos de balance pendientes.

## References

- `references/economy-and-quotas.md` — cuotas, minerales, capas, carga, tolva, tienda y guardado.
- `references/arsenal-staff-and-ladders.md` — armas, mejoras, jetpack, escaleras, empleados y pasivas.

## Related Skills

- `world-determinism` — HP y colocación de nodos.
- `coop-netcode` — compras, depósitos y economía compartida.
- `hud-and-shop` — presentación de cuotas, mochila y tienda.
- `save-and-roster` — persistencia de loadout, escaleras y plantilla.
