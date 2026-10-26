# HUD, overlays y contrato de IDs

## Capas del DOM

- `#app`: raíz de la escena y la UI.
- `#game-canvas`: render WebGL.
- `.screen-vignette`, `.screen-scanlines`, `#screen-fade`: postproceso CSS.
- `#hud`: HUD de partida; arranca con `is-hidden`.
- `#menu-overlay`: menú principal; es el único overlay visible al arrancar.
- `#lobby-overlay`, `#shop-overlay`, `#day-summary-overlay`, `#pause-overlay`, `#gameover-overlay`, `#network-overlay`, `#fatal-overlay`: overlays con `hidden`.
- `#shop-overlay` usa pestañas `[data-shop-tab]` y barra superior de caja/próxima cuota; `#day-summary-overlay` es la liquidación previa con `#day-summary-lines`, `#day-summary-bonus`, `#day-summary-total` y `#day-summary-continue`.
- `#loading-overlay`: capa de carga con `hidden`.
- `#toast-stack`, `#float-layer`, `#hud-banner`: avisos.

## Contrato de IDs

`UI` construye referencias con `required<T>('id')`; `Game` usa `requiredElement<T>('id')`. Si un ID no existe, el arranque lanza `No se encontró el elemento de interfaz #...`.

Reglas:

- Un ID por elemento; no reutilizar entre HUD y overlays.
- Si renombras un ID, actualiza `index.html`, `UI.ts`, `Game.ts`, `View.ts`, `Interaction.ts`, `src/styles/*.css` y este documento.
- Los IDs dinámicos deben documentarse; evita generar IDs que colisionen con los estáticos.
- Los IDs de botones que llevan datos usan `data-*` (`data-weapon`, `data-item-id`), no IDs por ítem.

## HudViewData

```ts
interface HudViewData {
  day: number;
  timeLeft: number;
  quota: number;
  carbon: number;
  money: number;
  depth: number;
  layerName: string;
  fuel: number;
  maxFuel: number;
  onlineActive: boolean;
  onlinePlayers: number;
  onlineIsHost: boolean;
  muted: boolean;
  employees: number;
  cargoCoal: number;
  cargoMoney: number;
  cargoWeight: number;
  maxCargoWeight: number;
  inventorySlots: Array<InventoryItem | null>;
  inventoryCount: number;
  inventoryOpen: boolean;
  activeHotbarSlot: number;
  ladders: number;
  ladderPlacementEnabled: boolean;
  jetpackUnlocked: boolean;
  prompt: HudPrompt | null;
}
```

`HudPrompt = { key: string; text: string }`.

## HUD de partida

| Elemento | ID | Dato |
|---|---|---|
| Día | `hud-day` | `run.day` |
| Tiempo | `hud-time` | `run.timeLeft` |
| Carbón depositado | `hud-carbon` | `run.carbon` |
| Dinero | `hud-money` | `run.money` |
| Cuota | `hud-quota-fill`, `hud-quota-status`, `hud-quota-hint`, `quota-card` | `run.carbon / run.quota` |
| Profundidad / capa | `hud-depth`, `hud-layer` | posición y `layerAtDepth` |
| Combustible | `hud-fuel-fill`, `hud-fuel-value`, `jet-card`, `hud-jet-hint` | `fuel / maxFuel` |
| Hotbar | `inventory-hotbar` + 9 slots dinámicos | `inventorySlots` (0–8), `activeHotbarSlot`, `1-9` |
| Mochila/peso | `cargo-card`, `hud-cargo-weight`, `hud-cargo-weight-fill` | `cargoWeight`/`maxCargoWeight` |
| Inventario completo | `inventory-panel`, `inventory-grid`, `inventory-weight`, `inventory-summary` | `inventoryOpen`; `Tab`/`I`; 36 slots (9×4) |
| Tolva | `hud-hopper` | progreso visual |
| Online | `hud-online` | `onlineActive`, jugadores, host |
| Muteo | `hud-mute` | `audio.isMuted()` |
| Guardado | `hud-save` | `setSaved()` |
| Prompt | `interaction-prompt`, `interaction-key`, `interaction-text` | `E` deposita; clic izquierdo coloca y clic derecho gira escaleras; `G` muestra/oculta el fantasma |
| Objetivo | `objective-text`, `objective-hint`, `hud-objective-kind` | `computeObjective()` |
| Apuntado | `aim-panel`, `aim-type`, `aim-status`, `aim-detail`, `aim-fill` | veta/cofre/terreno; `kind='sign'` muestra la lectura de un cartel en DOM |
| Dial de escalera | `ladder-dial`, `ladder-dial-core`, `ladder-dial-cursor`, `[data-ladder-orientation]` | `UI.showLadderDial()`/`updateLadderDial()`/`hideLadderDial()`; dial central que se elige con el ratón, clic izquierdo confirma y clic derecho/`Esc` cancela |

## Overlays y estados

- `showMenu(save)`, `hideMenu()`.
- `showLobby(data)`, `updateLobby(data)`, `hideLobby()`.
- `showShop(data)`, `updateShop(data)`, `hideShop()`.
- `showPause(online, isHost)`, `hidePause()`.
- `showGameOver(data)`, `hideGameOver()`.
- `showNetworkError(message)`, `hideNetworkError()`.
- `showLoading(text)`, `hideLoading()`.
- `showBanner(kicker, text, duration)`: banner temporal.
- `notify(message, tone)`: toast (`info`, `positive`, `danger`).
- `spawnFloat(position, text, tone)`: aviso 3D proyectado a pantalla.
- `setObjective(text)`, `updateAim(aim)`.

Los métodos de ocultado deben ser idempotentes. `hideAll` no existe: cada transición oculta explícitamente lo que corresponda.

## Prompt contextual

`Interaction.updateInteractionState()` decide:

- Cerca de la tolva y con carga: `E · DEPOSITAR CARGA`.
- Con `G` activo, stock y un anclaje válido: `CLIC IZQ · COLOCAR ... · CLIC DER DIAL · G OCULTAR`; si el fantasma es inválido, muestra el motivo. Clic derecho abre el dial central de cuatro orientaciones; el ratón mueve el cursor virtual y resalta la opción, el clic izquierdo confirma y otro clic derecho o `Esc` cancela. Con `G` inactivo no hay fantasma ni prompt de escalera.
- Sin acción: `prompt = null`.

`handleInteract()` replica la misma prioridad. Si cambias el radio o el texto, actualiza ambos métodos y la referencia.

## Pointer lock y entrada

- El HUD solo se actualiza en `playing`.
- Al abrir pausa/tienda se libera el ratón; al volver a jugar se solicita de nuevo con un gesto.
- `Escape` pausa; `Enter` recupera el lock si está libre.
- La UI no debe capturar teclas de juego cuando un overlay está abierto.

## Accesibilidad y responsive

- Botones reales (`<button>`), no `div` clicables.
- `aria-label` en secciones y controles.
- Contraste suficiente sobre el fondo oscuro.
- Probado a 1280×720 y 960×540; el HUD no debe tapar el prompt ni la mira.
- En pantallas estrechas, la tienda hace scroll dentro de `shop-content`.

## Textos y formato

- Todo en español, tono corporativo/industrial.
- Números: `formatNumber`, `formatMoney`, `formatDepth`, `formatTime` de `src/ui/format.ts`.
- No introduzcas cadenas en inglés en la UI de juego.
- No añadas fuentes externas; la tipografía es del sistema.
- El logo se dibuja con `renderPixelLogo()` en `PixelLogo.ts`.
