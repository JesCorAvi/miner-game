---
name: hud-and-shop
description: "HUD, overlays, menús, tienda nocturna, pixel mode y contrato de IDs de Carbon Magnate. Úsala al tocar index.html, UI.ts, style.css o los textos de interfaz."
---

# HUD and Shop

## Overview

La interfaz de Carbon Magnate es DOM/CSS acoplada por IDs a `src/ui/UI.ts`. El constructor de `UI` exige prácticamente todos los elementos de `index.html`: renombrar o eliminar un ID sin actualizar el código rompe el arranque. El HUD prioriza la lectura del bucle: cuota depositada, hotbar de 9, escaleras, granadas, estado de la tolva, jetpack bloqueado y estado online. La hotbar (`inventory-hotbar`) está siempre visible y el panel completo (`inventory-panel`, 9×4) se abre con `Tab`/`I`; `InventoryView.ts` gestiona iconos, tooltips, contadores, pulsos y arrastre, y `MineralIcon.ts`/`ItemIcon.ts` generan los iconos en canvas.

La presentación separa dos espacios: exterior/menús/oficina en pixel art (`#game-canvas.is-pixelated`, filtro SVG `#pixel-quantize`, `body.is-outside-pixel`) e interior low-poly a resolución completa. Toda la UI está en español, con tono corporativo/industrial.

## When to Use

- Añadir o modificar HUD, overlays, menús, lobby, pausa, game over o tienda.
- Añadir botones, toasts, banners, avisos flotantes o el prompt contextual de `E`/`R`.
- Cambiar la hotbar, el panel de inventario `Tab`/`I`, sus iconos, stacks, tooltips o arrastre.
- Cambiar el pixel mode exterior, la resolución interna o el filtro de cuantización.
- Renombrar IDs, mover secciones de la tienda o cambiar textos de interfaz.
- Persistir una preferencia visual (con cuidado: el expediente vive en `save-and-roster`).

## When Not to Use

- Cambiar modelos, texturas o materiales: usa `procedural-content`.
- Cambiar sonidos de UI: usa `procedural-audio`.
- Cambiar precios, cuotas o ítems: usa `balance-and-loop` y después vuelve aquí para presentarlos.
- Cambiar mensajes/snapshots: usa `coop-netcode`.
- Cambiar el bridge Electron o la ventana: usa `desktop-packaging`.

## Mandatory Workflow

1. **Clasifica la superficie.** HUD en partida, overlay de pantalla completa, modal, panel de tienda, aviso temporal o preferencia.
2. **Enumera los estados.** Visible/oculto, host/cliente, online/solo, compra posible/imposible, jetpack bloqueado/desbloqueado, con carga/sin carga.
3. **Elige la capa.** `index.html` para estructura, `src/style.css` para estilos, `src/ui/UI.ts` para lógica. Nada de estilos estructurales inline salvo valores dinámicos.
4. **Respeta el contrato de IDs.** Añade el elemento al HTML y la referencia `required()`/`getElementById()` en el mismo cambio.
5. **Integra el dato.** Si es un campo nuevo de partida, pásalo por `HudViewData` o `ShopViewData`; no leas estado interno de `Game` desde la UI.
6. **Revisa el pixel mode.** Si el elemento aparece en superficie/oficina, comprueba que se lee con la resolución interna baja.
7. **Audita.** `node .claude/skills/hud-and-shop/scripts/audit-ui.mjs`.
8. **Prueba.** 1280×720 y 960×540, menú → partida → cierre/liquidación → pestañas de tienda, host/cliente y Electron si aplica.

**Condición de parada:** si el diseño visual no está definido, reutiliza el patrón de un panel hermano y declara la suposición. No preguntes por colores o tipografías que ya están en `style.css`.

## Decision Table

| Necesidad | Patrón | Ubicación |
|---|---|---|
| Pantalla completa nueva | `<section class="overlay ..." hidden>` | `index.html` + `style.css` + `UI.showX/hideX` |
| HUD fijo en partida | Elemento dentro de `#hud` (no overlay) | `index.html` + `HudViewData` + `updateHud()` |
| Tarjeta de tienda | `ShopItemView` + `renderShopItems()` | `src/ui/shopView.ts` + `Shop.buildShopItems()` |
| Sección de tienda | Pestaña `ShopTab` en `renderShopItems()` | `src/ui/shopView.ts` (Empleados → Equipo → Mejoras → Inventario) |
| Prompt contextual | `interaction-prompt` + `HudPrompt` | `Interaction.updateInteractionState()` + `UI.updateHud()`; `E` deposita, clic izquierdo coloca y clic derecho abre el dial central de escalera |
| Aviso temporal | `toast-stack` + `notify()` | `UI.ts` |
| Aviso flotante 3D | `float-layer` + `spawnFloat()` | `UI.ts` |
| Banner de fase | `hud-banner` + `showBanner()` | `UI.ts` |
| Indicador de guardado | `hud-save` + `setSaved()` | `UI.ts` |
| Inventario de objetos | `inventory-hotbar` + `inventory-panel` + `InventoryView` | `UI.ts` + `InventoryView.ts` + `HudViewData`; `Inventory.ts` es la fuente de slots |
| Pixel mode | `updatePixelMode()` + `applyRenderResolution()` | `View.ts` + `src/styles/*.css` + SVG `#pixel-quantize` |
| Texto formateado | `src/ui/format.ts` | `formatNumber`, `formatMoney`, `formatDepth`, `formatTime` |

## Non-Negotiable Rules

- **Contrato de IDs.** Todo `required<T>('id')`, `requiredElement('id')` o `getElementById('id')` debe existir en `index.html`. No reutilices IDs.
- **Overlays ocultos al arrancar.** Todos los `.overlay` llevan `hidden` salvo `menu-overlay`. Los métodos `showX()`/`hideX()` deben ser simétricos.
- **HUD de partida.** Mantén día, tiempo, cuota depositada, carbón, dinero, profundidad/capa, arma activa, estado del jetpack, mochila rápida con stacks, escaleras, tolva y estado online.
- **Mochila separada de la cuota.** No mezcles `cargoCoal`/`cargoMoney`/`cargoWeight` con `run.carbon`/`run.money`; el jugador debe entender que la carga no cuenta hasta la tolva y que el peso y los slots llenan la capacidad. La hotbar muestra 9 casillas (herramientas, escaleras, granadas y minerales) y el panel 9×4 se abre/cierra con `Tab`/`I`: en solo libera el cursor y pausa, en online el reloj sigue. Los objetos se arrastran entre hotbar y almacenamiento.
- **Slots y tooltips.** Cada slot muestra icono procedural, `xN` en la esquina y `title`/`data-tooltip` con nombre, cantidad, peso del stack y valor. El pulso al recibir usa `InventoryView`; no dupliques esa lógica en `UI.ts`.
- **Iconos procedurales.** Los iconos de mineral se generan en canvas (`MineralIcon.ts`); no uses imágenes externas.
- **Jetpack bloqueado a nivel 0.** La HUD y la tienda deben mostrar el bloqueo y el coste de desbloqueo.
- **Tienda por grupos.** Suministros → granadas → plantilla → arsenal → mejoras. El cliente ve "esperando al anfitrión"; solo el host puede iniciar el día siguiente.
- **Un solo listener por control.** No dupliques `addEventListener` al abrir/cerrar; `UI.dispose()` debe limpiar los que correspondan.
- **Sin recursos externos.** Nada de imágenes, fuentes descargadas ni iconos remotos; el logo se dibuja en canvas (`PixelLogo.ts`).
- **Español y formato.** Textos en español, números con `format.ts`; no introduzcas cadenas en inglés en la UI de juego.
- **Pixel mode solo exterior.** No apliques el filtro de cuantización bajo tierra; el interior debe conservar resolución completa.
- **No leas el estado interno de `Game` desde la UI.** Pasa datos por `HudViewData`, `ShopViewData`, `LobbyViewData` o `GameOverViewData`.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-ui.mjs` sin IDs duplicados, referencias inexistentes ni overlays mal ocultos.
- **Nivel 1 — Render:** menú, HUD, pausa, game over y tienda abren/cierran sin solaparse.
- **Nivel 2 — Estados:** host/cliente, online/solo, jetpack bloqueado, mochila vacía/llena, stack lleno/overflow y tienda sin dinero.
- **Nivel 3 — Interacción:** teclado/ratón, `E`, `Tab`/`I`, `Esc`, pointer lock, scroll de tienda y compra con clic.
- **Nivel 4 — Integración:** 1280×720, 960×540, Electron y flujo online sin errores de consola.

**Reporta el nivel alcanzado y cualquier resolución, navegador o flujo que no se haya probado.**

## Output Expectations

- Superficie y estados implementados.
- Archivos tocados (HTML, CSS, UI, Game) y campos de vista añadidos.
- Persistencia o migración, si la hubiera.
- Resultado de `audit-ui.mjs`.
- Niveles de validación alcanzados y riesgos.

## References

- `references/hud-and-overlays.md` — capas DOM, HUD, overlays, prompt, toasts y contrato de IDs.
- `references/shop-and-pixel-mode.md` — tienda, grupos, tarjetas, pixel mode y formato español.

## Related Skills

- `procedural-content` — logo, texturas canvas y geometría del escenario.
- `procedural-audio` — sonidos de interacción.
- `balance-and-loop` — precios, cuotas y contenido de la tienda.
- `coop-netcode` — lobby, estados online y compras.
- `desktop-packaging` — ventana y protocolo `carbon://`.
