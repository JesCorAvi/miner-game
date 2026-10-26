# Tienda y pixel mode

## ShopViewData

```ts
interface ShopViewData {
  success: boolean;
  victory: boolean;
  infinite: boolean;
  day: number;
  carbon: number;
  quota: number;
  nextQuota: number;
  money: number;
  loadout: Loadout;
  stats: RunStats;
  items: ShopItemView[];
  canPurchase: boolean;
  isHost: boolean;
  online: boolean;
}
```

`ShopItemView.kind`: `weapon`, `upgrade`, `supply`, `grenade`, `employee_hire`, `employee_rank`, `employee_convert`.

Cada ítem: `id`, `kind`, `title`, `description`, `cost`, `level`, `owned`, `maxed`, `affordable`.

## Construcción de ítems

`Shop.buildShopItems()` genera, en este orden de datos:

- `weapon:<id>` para cada `WEAPON_ORDER`.
- `upgrade:<id>` para cada `UPGRADES`.
- `supply:ladders` (4 escaleras por 30).
- `employee_hire:miner` (precio `hireCost('miner', roster.length)`).
- `employee_rank:<id>` por cada empleado.
- `employee_convert:<id>` solo si es minero (coste 150).

La UI agrupa en cuatro pestañas (`ShopTab`):

1. `employees`: contratación, ascensos y reconversión → ORGANIGRAMA DE PLANTILLA.
2. `equipment`: armas, escaleras y granadas → EQUIPO DE EXTRACCIÓN.
3. `bonuses`: mejoras de operario → MEJORAS DE OPERARIO.
4. `inventory`: equipo permanente en solo lectura → INVENTARIO PERMANENTE.

No cambies solo el orden de `buildShopItems`; la presentación depende de `shopView.renderShopItems(container, data, tab)` y de las pestañas `[data-shop-tab]` de `index.html`.

## Tarjetas

`shopView.makeShopCard()`:

- Icono procedural (`ItemIcon.ts`), etiqueta de tipo, título, descripción, nivel/estado y coste formateado.
- Las pestañas muestran un contador; el título y la nota cambian con la pestaña activa.
- La barra superior muestra caja, próxima cuota (`nextQuota`), día, modo y estado de guardado.
- Botón con `dataset.itemId = item.id`.
- Deshabilitado si `owned`, `maxed`, `!canPurchase` o `!affordable`.
- Textos: ADQUIRIDO, AL MÁXIMO, COMPRAR, FONDOS INSUFICIENTES.

La tienda delega el clic en `#shop-content`; no añadas un listener por tarjeta.

## Host y cliente

- Solo se compra si `phase === 'shop' && shopSuccess`.
- Cliente: `requestPurchase(itemId)` → `purchase` al host.
- Host: `ShopView.applyPurchase()` valida, descuenta, guarda y difunde `shop_state`.
- El cliente ve `shop-wait-host`; el host ve `shop-next`.
- El botón "siguiente día" solo existe para el host (`isHost`).
- En online, el cliente no inicia el día ni escribe expediente.

## Liquidación previa

- `#day-summary-overlay` se muestra antes que `#shop-overlay` al cerrar un día con éxito.
- `UI.showDaySummary(report)` pinta el desglose por mineral, carbón, rendimiento, bonus y total; `#day-summary-continue` llama a `Game.openShopAfterSummary()`.
- El host calcula el informe (`DaySettlement.buildDayReport`); el cliente lo recibe en `day_result.report` y no lo recalcula.
- `#day-summary-lines` admite líneas de cuota (carbón), minerales, varios, bonus y total. Las líneas sin icono usan `.is-text-only`.
- La tienda no se muestra hasta pulsar Continuar.

## Estados de la pantalla

- `success = false`: no se muestra la tienda; el flujo es game over.
- `victory = true`: muestra `shop-victory-chip`.
- `infinite = true`: sigue mostrando tienda y "siguiente día".
- `canPurchase = false`: botones deshabilitados (cliente esperando o fase incorrecta).
- `money` insuficiente: tarjeta con `is-expensive` y botón deshabilitado.
- El scroll de `shop-content` debe conservarse al recomprar (no reconstruir con scroll 0 si se puede evitar).

## Pixel mode

`View.updatePixelMode(game, force)`:

```ts
const usePixel = this.phase !== 'playing' || this.player.getEyePosition().y > -1.25;
```

- Menú, lobby, tienda, pausa, game over y superficie → pixel mode.
- Bajo tierra (y ≤ -1.25) → resolución completa.
- Conmuta:
  - `#game-canvas.is-pixelated`
  - `document.body.is-outside-pixel`
- `applyRenderResolution()`:
  - Pixel: `ratio = clamp(620 / width, 0.19, 0.5)`.
  - Interior: `min(devicePixelRatio, 1.75)`.
- `handleResize()` recalcula la resolución.

CSS:

- `#game-canvas.is-pixelated { image-rendering: pixelated; filter: url(#pixel-quantize) ... }`.
- El filtro `#pixel-quantize` vive en el SVG inline de `index.html`.
- `body.is-outside-pixel` puede ajustar la UI exterior; no lo uses para el interior.

Texturas:

- Las texturas de canvas del exterior usan `NearestFilter`.
- Los degradados radiales suaves (glow de nodos, polvo) son intencionados; no los fuerces a nearest.

## Prueba visual

1. Menú: pixel mode activo y legible.
2. Superficie: pixel mode; la tolva y los carteles se leen.
3. Descenso por debajo de -1.25: resolución completa y linterna.
4. Vuelta a superficie: pixel mode de nuevo.
5. Tienda y pausa: pixel mode, sin filtro sobre el HUD si no corresponde.
6. 1280×720 y 960×540: sin solapamientos ni scroll horizontal.
7. Electron: misma apariencia y sin errores de `carbon://`.
