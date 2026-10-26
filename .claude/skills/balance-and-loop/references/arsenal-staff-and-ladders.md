# Arsenal, mejoras, escaleras y plantilla

## Armas (`WEAPONS`)

| Arma | Estilo | Daño | Cadencia | Alcance | Carve | Desbloqueo |
|---|---|---|---|---|---|---|
| `pickaxe` | melee | 34 | 0,34 s | 5,0 | r 0,15 · s 0,9 | Inicial |
| `tesla` | chain | 30 | 0,88 s | 5,9 | r 0,35 · s 0,5 | 380 |
| `drill` | continuous | 24 | 0,085 s | 5,2 | r 1,12 · s 1,25 | 820 |
| `shotgun` | shotgun | 17 × 9 perdigones | 0,82 s | 10 | r 0,55 · s 0,75 | 1.250 |
| `shotgun` | shotgun | 17 × 9 | 0,82 s | 10 | r 0,55 · s 0,75 | 1.250 |

Las granadas ya no son un arma: son consumibles de cuatro tiers (`GRENADE_TIERS`) con el mismo radio de explosión y distinta potencia/capa máxima. Se compran en la tienda, se mueven en el inventario y se lanzan desde la hotbar. Ver `plan.md` §4.4 para precios y `maxLayer`.

- `WEAPON_ORDER` define el orden de la barra y de la tienda.
- El daño escala con `damageMultiplier(loadout)`; la cadencia con `cooldownMultiplier`.
- El taladro mantiene el disparo; la escopeta impulsa al jugador si se dispara hacia abajo (`shotgun jump`).
- La granada rebota y explota con `blastRadius` 5,6.
- El pico usa un radio pequeño a propósito: el túnel grande es del taladro/explosivos.

## Mejoras (`UPGRADES`)

| Id | Efecto | Coste base | Crecimiento | Máximo |
|---|---|---|---|---|
| `damage` | +12 % daño a vetas/nivel | 120 | 1,55 | 10 |
| `speed` | +6 % cadencia/nivel | 150 | 1,55 | 8 |
| `magnet` | +0,55 m imán/nivel | 110 | 1,5 | 6 |
| `jetpack` | Desbloquea y amplía (+20 combustible/nivel) | 3.000 | 1,55 | 6 |
| `dayTime` | +15 s/nivel | 280 | 1,7 | 5 |
| `capacity` | +20 kg de mochila/nivel | 160 | 1,55 | 6 |

Coste: `round(baseCost × growth^level / 5) × 5`.

## Pasivas de cofre (`PASSIVES`)

| Id | Efecto |
|---|---|
| `digRadius` | +8 % radio de excavación |
| `nodeDamage` | +10 % daño a nodos |
| `magnet` | +0,4 m de imán |
| `employeeSpeed` | +12 % velocidad de empleados |
| `jetpackFuel` | +20 de combustible máximo |

- Cada cofre elige una pasiva determinista por semilla + `nodeId`.
- El host la aplica y difunde el loadout; el cliente la recibe por `passive`.
- Las pasivas son permanentes durante el expediente.

## Jetpack

```ts
maxJetpackFuel(loadout) =
  loadout.upgrades.jetpack <= 0
    ? 0
    : 100 + (loadout.upgrades.jetpack - 1) * 20 + loadout.passives.jetpackFuel * 20;
```

- Nivel 0 → 0 combustible; `Player` exige `maxFuel > 0` para saltar/propulsarse.
- Nivel 1 → 100; cada nivel adicional +20; la pasiva suma +20.
- `Player.setLoadout()` pone `fuel = 0` si el máximo baja a 0.
- La HUD muestra el bloqueo y la tienda lo presenta como inversión avanzada.
- Es una compra de $3.000; no hay bloqueo por número de día.

## Escaleras

- `STARTING_LADDERS = 8`; `LADDER_PACK_SIZE = 4`; `LADDER_COST = 30`; `COLLECTOR_CONVERSION_COST = 150`.
- `LADDER_HEIGHT = 4.4`; `LADDER_REACH = 5.5`.
- Colocación con clic izquierdo y fantasma (`G`); clic derecho abre un **dial central** con `vertical`, `diagonal-up` (rampa ascendente), `horizontal` (puente) y `diagonal-down` (rampa descendente). El movimiento del ratón resalta la opción, el clic izquierdo confirma y `Esc`/otro clic derecho cancela; `R` cicla como alternativa; `E` solo deposita. Se consume una unidad del stock de equipo.
- Anclaje obligatorio: pared, suelo u otra escalera; ninguna escalera puede quedar flotando. Verticales se apilan sobre la cima; horizontales se prolongan desde el extremo, se anclan a la cima o a **cualquier altura apuntada** de una vertical (`findNearestTop`/`findVerticalPoint`/`findNearest`/`findNearestEnd`). Las diagonales son rampas transitables de 45°: `findDiagonalLink()` les da prioridad para enlazar su extremo con una escalera cercana (cima, tramo o punta); si no hay, apoyan el extremo inferior (ascendente) o superior (descendente) en el suelo. Se rechazan rampas sin apoyo y las que atraviesan roca o la plataforma segura. Al coronar se permanece en el filo, sin plataforma añadida; desde ahí se sigue construyendo hacia arriba o a los lados. Se permiten cruces, esquinas y uniones en T; solo se rechaza que dos puentes discurran casi en la misma línea y se pisen.
- El manto solo acepta apoyos entre 0,35 m por debajo y 0,45 m por encima de los pies; así una escalera larga no teletransporta al jugador a una repisa inferior.
- Escalada: `W` sube por la cara desde la que te acercas, `S` baja, `A`/`D` suelta y `Space` suelta y salta desde cualquier altura; en la cima, `tryMantle` o sube a un puente superior. Las horizontales y las rampas diagonales son transitables.
- Las colocadas se limpian al cargar el siguiente día; el stock comprado persiste.
- `MAX_LADDERS = 80` en `Ladders.ts`.

## Plantilla (`EMPLOYEE_RANKS`)

| Rango | Nombre | Multiplicador | Coste de ascenso |
|---|---|---|---|
| 0 | Becario | 0,8 | — |
| 1 | Asociado | 1,2 | 340 |
| 2 | Senior | 1,7 | 860 |
| 3 | Vicepresidente | 2,35 | 1.880 |

- `HIRE_GROWTH = 1.52`; `hireCost(kind, count) = round(baseCost × 1.52^count / 5) × 5`.
- `EMPLOYEE_LABELS`: minero corporativo (260) y recolector de activos (190).
- `employeeRankMultiplier(rank, employeeSpeedPassive) = multiplicador × (1 + pasiva × 0,12)`.
- Máximo `MAX_EMPLOYEES = 6`; `MAX_EMPLOYEE_RANK = 3`.
- **Todo contrato nuevo es minero becario** (`kind: 'miner'`, `rank: 0`).
- Ascenso: sube `rank`, conserva `id` y `kind`.
- Reconversión a recolector: cuesta 150, conserva `id` y `rank`, cambia `kind`.
- Los mineros buscan y golpean nodos; nacen en la superficie, comprueban cápsula y se ajustan al suelo para no incrustarse en la roca. Los recolectores no pican: vuelan hasta cada pepita que quepa en su peso restante, cargan hasta `COLLECTOR_CARRY_WEIGHT` (20 kg, media mochila inicial) y, al agotar el racimo cercano, llenarse o no encontrar objetivos recogibles, vuelven a la tolva. Entran y salen del pozo por la boca para no atravesar la plataforma; bajo tierra el vuelo sigue siendo directo (sin navmesh) y `StaffAvatars` oculta el rig mientras el cuerpo esté dentro de roca.
- Los clientes no simulan plantilla; solo interpolan `NetworkStaffState` a 5 Hz.

## Pautas de ajuste

- Cambia primero una variable, prueba un día completo y anota el efecto.
- No dupliques una mejora en los módulos de dominio; consume siempre los helpers de `config.ts`.
- Si añades una pasiva, conéctala en `config.ts` y en el sistema que la usa; una clave sin consumidor no hace nada.
- Si cambias un rango o coste, revisa `ShopView.applyPurchase`, `Shop.buildShopItems`, `SaveManager` y la UI.
- Si cambias el número máximo de empleados, actualiza `SaveManager`, `Protocol` (staff), `StaffManager` y la UI.
