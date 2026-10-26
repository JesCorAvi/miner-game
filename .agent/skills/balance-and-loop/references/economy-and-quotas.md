# Economía, cuotas y bucle de tolva

## Turno

- Duración base: `BASE_DAY_TIME = 90` s.
- Mejora `dayTime`: `+DAY_TIME_PER_LEVEL = +15` s por nivel, máximo 5 → 165 s.
- `dayDuration(loadout) = 90 + loadout.upgrades.dayTime * 15`.
- El reloj solo lo descuenta la autoridad (host/solo). El cliente recibe `timeLeft` por `economy` y lo interpola.
- Al llegar a 0, el host llama a `DayCycle.finishDay()`.

## Cuotas

La tabla exacta por día está en `plan.md` §4.1; la fuente ejecutable es `QUOTAS` en `src/config.ts`. Día 1 = 40 y día 15 = 40.000; no dupliques la tabla en las skills.

- `quotaForDay(day, players) = baseQuotaForDay(day) × (1 + 0,6 × (jugadores - 1))`.
- Se fija al empezar el día; un late-join no la modifica.
- Después del día 15: `última × 1,38^(día - 15)`, redondeado a decenas.
- `VICTORY_DAY = 15`; si se cubre la cuota del día 15, hay victoria y el host puede activar `infinite`.

## Capas y minerales

| Capa | Profundidad | Dureza | Minerales |
|---|---|---|---|
| 1 | 0–25 m | ×1,0 | Carbón común, cobre |
| 2 | 25–55 m | ×1,7 | Carbón denso, hierro, amatista |
| 3 | 55–85 m | ×2,8 | Carbón presurizado, oro, rubí |
| 4 | 85–120 m | ×4,5 | Carbón puro, esmeralda, diamante rosa |

La dureza reduce el radio/potencia del carve, no el HP del nodo. Los minerales se reparten en `MINERALS`. El carbón aporta `carbonYield` (cuota) **y** `moneyYield` (dinero); los minerales y gemas solo aportan dinero. La arcilla y los escombros de roca no son looteables.

Cada nodo reparte su rendimiento entre 7–10 fragmentos; los restos se asignan a los primeros. Cada fragmento tiene `MINERALS[].weight` (0,12–0,24 kg) y entra en el inventario de **9 slots de hotbar + 27 de almacenamiento** (minerales a 64). La mochila se llena por peso (base 40 kg + 20 kg por nivel de `capacity`) o por slots.

## Mochila, inventario y tolva

- `Inventory` es la fuente de verdad local de los stacks; `cargoCoal`, `cargoMoney` y `cargoWeight` se derivan de sus totales.
- Recoger no toca `run.carbon`, `run.money`, la cuota ni las estadísticas.
- `depositCargo()` exige `phase === 'playing'` y `isNearHopper()`:
  - Radio horizontal `HOPPER_INTERACT_RADIUS = 3.5`.
  - Altura entre `SURFACE_DECK_Y - 0.5` y `+2.5`.
- Al depositar:
  - Se vacían los stacks y la mochila, con animación y sonido de vaciado.
  - Host/solo: `applyTeamDeposit()` suma a `run.carbon`, `run.money`, `stats.coalMined` y `stats.moneyEarned`.
  - Cliente: envía `deposit`; el host acredita y difunde `economy`. Si el envío falla, conserva la carga.
- `Hopper.update(dt, carbon + dailyMoney × 0.025, quota)`:
  - `dailyMoney = max(0, run.money - dayMoneyBase)` se usa para el volumen visual de la tolva.
  - El host registra `Inventory.breakdown()` en `dayLedger` mediante `deposit.lines`.
  - Al cerrar, `buildDayReport()` calcula `oreValue`, el bonus por rendimiento y el total; el bonus se suma a `run.money`/`stats.moneyEarned`.
  - El montón se suaviza con `damp`, se desborda por encima de la cuota y crece con una fracción del dinero del día.
- Al cerrar el día, `discardCargo()` pierde lo que quedó en la mochila y el inventario.
- Los golpes a nodos generan 1–2 fragmentos extra; el yield total del nodo se conserva descontando el valor de los chips del lote de rotura local. Picar terreno normal no genera fragmentos.
- El recolector de la plantilla busca pepitas sueltas, las recoge de una en una, se limita a `COLLECTOR_CARRY_WEIGHT = 20 kg` y vuela a la tolva para depositar; no pica ni entrega a distancia. Cuando agota el racimo cercano vuelve con la carga parcial.

## Fin de día

- Éxito: `run.carbon >= run.quota`.
  - Suma `stats.daysCompleted`.
  - Abre `shop` (`shopSuccess = true`).
  - `shopVictory = day >= 15 && !infinite`.
  - Guarda el expediente del día siguiente.
  - Difunde `day_result` a los clientes.
- Fracaso:
  - Abre `gameover`.
  - `saves.clear()` borra el expediente.
  - Difunde `game_over`.

## Tienda nocturna

- Solo se compra si `phase === 'shop' && shopSuccess`.
- El host valida; el cliente solo envía `purchase`.
- Presentación por pestañas: Empleados, Equipo (armas + escaleras + granadas), Mejoras e Inventario. La barra superior muestra caja y próxima cuota.
- Grupos y orden de presentación:
  1. Suministros: `supply:ladders` (4 escaleras por 30).
  2. Plantilla: contratación, ascenso y reconversión.
  3. Arsenal: armas.
  4. Mejoras: `damage`, `speed`, `magnet`, `jetpack`, `dayTime`, `capacity`.
- `buildShopView()` expone `canPurchase`, `isHost`, `online`, dinero, loadout, estadísticas e ítems.
- El cliente ve "esperando al anfitrión"; no puede iniciar el día siguiente.
- La compra se guarda (`DayCycle.saveRun(game, false)`) y se difunde (`shop_state`).

## Persistencia del bucle

- Se guarda al iniciar cada día, cada 12 s, al ocultar/cerrar la pestaña, al comprar y al terminar un día con éxito.
- En la tienda se guarda `day + 1`; así "continuar" reanuda en el siguiente turno.
- El fracaso borra la partida; el nombre de operario se conserva.
- Los clientes online no escriben expediente.

## Ajustar sin romper el bucle

- Si subes la cuota, revisa duración, rendimiento de carbón y precio de escaleras/jetpack.
- Si subes el rendimiento de minerales, recuerda que el dinero no cuenta para la cuota; solo la tolva lo convierte en progreso visual y económico. El carbón es la excepción: suma a la cuota y también paga dinero.
- Si abaratas el jetpack, el early game pierde la tensión de volver por escaleras.
- Si cambias `MAX_EMPLOYEES`, actualiza `SaveManager`, `StaffManager`, `Protocol` y la UI.
- Cualquier cambio de forma del loadout afecta a `SaveManager` y a los snapshots.
