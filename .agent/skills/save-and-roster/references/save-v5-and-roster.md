# Guardado v5 y plantilla individual

## Claves

| Clave | Contenido |
|---|---|
| `carbon-magnate.save.v5` | Expediente actual |
| `carbon-magnate.name` | Nombre del operario (preferencia) |
| `carbon-magnate.save.v4` | Solo lectura; migración |
| `carbon-magnate.save.v3` | Solo lectura; migración |
| `carbon-magnate.save.v2` | Solo lectura; migración antigua |

- `SAVE_VERSION = 5`.
- `SaveManager.load()` acepta `version === 2`, `3`, `4` o `5`; cualquier otra se descarta.
- `SaveManager.save()` escribe `version: 5`, `savedAt: Date.now()` y elimina las claves v4/v3/v2.
- `SaveManager.clear()` borra el expediente, no el nombre.

## Esquema

```ts
interface SaveData {
  version: 5;
  savedAt: number;
  day: number;
  money: number;
  infinite: boolean;
  loadout: Loadout;
  stats: RunStats;
  playerName: string;
}

interface Loadout {
  weapons: WeaponUnlocks;      // Record<WeaponId, boolean> — 4 armas, sin lanzagranadas
  upgrades: UpgradeLevels;     // damage, speed, magnet, jetpack, dayTime, capacity
  passives: PassiveLevels;     // digRadius, nodeDamage, magnet, employeeSpeed, jetpackFuel
  employees: { roster: EmployeeRecord[]; nextId: number };
  ladders: number;
  grenades: Record<GrenadeTierId, number>; // frag, charge, breach, seismic
}

interface EmployeeRecord { id: string; kind: 'miner' | 'collector'; rank: number; }

interface RunStats {
  coalMined: number;
  moneyEarned: number;
  nodesBroken: number;
  chestsOpened: number;
  daysCompleted: number;
  playSeconds: number;
}
```

`SaveSummary = { day, money, savedAt, daysCompleted }`.

## Normalización

`normalizeLoadout(value)`:

- Parte de `makeDefaultLoadout()`.
- Armas: recorre `WEAPON_ORDER`; el pico siempre `true`; el resto `Boolean(...)`.
- Mejoras: entero 0..`UPGRADES[key].max`.
- Pasivas: entero 0..99.
- Empleados: `normalizeEmployees()`.
- Escaleras: entero `STARTING_LADDERS`..999 (0 permitido, default 8).

`normalizeEmployees(record)`:

- Si hay `roster` array: máximo `MAX_EMPLOYEES` (6).
- Cada entrada: `kind` solo `collector` o `miner` (default `miner`); `rank` 0..3; `id` saneado a `[a-zA-Z0-9_-]`, máximo 48; IDs duplicados → `emp-N`.
- Si no hay `roster`: migración v2/v3 desde `miners`, `collectors` y `rank`.
- `nextId = max(mayor emp-N + 1, record.nextId, generatedId)`.
- No se conservan contadores globales en el esquema nuevo.

`normalizeStats(value)`:

- Enteros no negativos con topes; `playSeconds` como número.
- Valores ausentes → 0.

## Disparadores de guardado

| Momento | Método |
|---|---|
| Iniciar día | `DayCycle.beginAuthorityDay()` → `saveRun(false)` en `Session.startSolo`/`DayCycle.startNextDay` |
| Cada 12 s | `fixedUpdate()` con `AUTOSAVE_INTERVAL = 12` |
| Ocultar pestaña | `visibilitychange` → `saveRun(false)` |
| Cerrar pestaña | `pagehide` → `saveRun(false)` |
| Comprar | `ShopView.applyPurchase()` → `DayCycle.saveRun(false)` |
| Fin de día exitoso | `DayCycle.finishDay()` → `saveRun(false)` (guarda `day + 1`) |
| Fracaso | `DayCycle.finishDay()` → `saves.clear()` |

`DayCycle.saveRun()` no guarda si:

- `role === 'client'`.
- `phase` es `menu`, `lobby` o `gameover`.

En la tienda, `saveInShop = phase === 'shop' && shopSuccess`; el día guardado es `day + 1` y `infinite` se mantiene si hay victoria.

## Roster y compras

- `MAX_EMPLOYEES = 6`; `MAX_EMPLOYEE_RANK = 3`.
- Todo contrato nuevo: `id = emp-${nextId}`, `kind = 'miner'`, `rank = 0`; `nextId += 1`.
- La lógica de compra, ascenso y reconversión vive en `src/core/Shop.ts` (`applyPurchaseToRun`); `ShopView.applyPurchase()` guarda y difunde el resultado.
- Ascenso: `employee.rank += 1`; conserva `id` y `kind`; coste `rankCost(rank)`.
- Reconversión: `employee.kind = 'collector'`; conserva `id` y `rank`; coste `COLLECTOR_CONVERSION_COST = 150`.
- Solo se puede reconvertir un minero.
- `hireCost('miner', roster.length) = round(260 × 1.52^count / 5) × 5`.
- Las compras se guardan y, en co-op, el host difunde `shop_state`.

## Migración v2

Formato antiguo posible:

```json
{
  "version": 2,
  "loadout": {
    "employees": { "miners": 2, "collectors": 1, "rank": 1, "nextId": 4 }
  }
}
```

Al leer:

- Se crean `emp-1`, `emp-2`, ... con el `rank` heredado.
- Los primeros `miners` son `miner`; el resto, `collector`.
- `nextId` se recalcula para no colisionar.
- Se aplican los defaults del loadout actual.
- Al guardar, se escribe v5 y se eliminan v4, v3 y v2.

## Prueba

1. Nueva operación → jugar → comprar → recargar → continuar.
2. Comprobar día, dinero, armas, mejoras, pasivas, escaleras y roster.
3. Fallar un día → el expediente desaparece; el nombre sigue.
4. Cargar un JSON v4/v3/v2 con `miners`/`collectors` y comprobar que el roster se crea, `capacity` arranca en 0 y `grenades` arranca en `{0,0,0,0}`.
5. En co-op, jugar como cliente, recargar y comprobar que no se ha escrito expediente.
