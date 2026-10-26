# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**Carbon Magnate** (`carbon-magnate@2.0.0`) es un juego 3D de minería en primera persona para navegador y Windows. Combina excavación orgánica determinista, cuotas diarias, tienda nocturna y cooperativo P2P de 1–4 jugadores. El bucle early-game exige volver a la superficie, depositar la carga en una tolva y usar escaleras baratas; el jetpack es una compra de fase avanzada. Toda la UI y los textos de juego están en español. Todo el arte y el audio son procedurales; no hay imágenes, modelos, fuentes ni sonidos externos.

Documentos relacionados:

- `README.md`: descripción de usuario, controles, instalación y arquitectura resumida.
- `plan.md`: diseño detallado, estado actual, decisiones, limitaciones y roadmap.

## Comandos

```bash
npm install
npm run dev              # Vite en http://127.0.0.1:5173
npm run typecheck        # tsc --noEmit, strict + noUnusedLocals/Parameters
npm run build:web        # typecheck + build de dist/
npm run electron:dev     # Vite (5173) + Electron; el puerto debe estar libre
npm run electron:preview # build web + Electron sobre dist/
npm run build:win        # build web + electron-builder portable
```

El ejecutable sale en `release/CarbonMagnate-2.0.0-portable.exe`. `dist/` y `release/` están ignorados por Git.

GitHub Pages: `.github/workflows/deploy-pages.yml` compila y publica `dist/` en cada push a `main`; `actions/configure-pages` intenta habilitar el origen **GitHub Actions** y, si la organización lo bloquea, hay que activarlo en **Settings → Pages → Source: GitHub Actions**. `base: './'` mantiene los assets relativos para el subdirectorio de Pages y para `carbon://`; `public/.nojekyll` viaja en el artefacto.

No existe runner de tests, ESLint ni comando de test individual. El workflow de Pages ejecuta `npm ci` y `npm run build:web`, no tests. La validación mínima antes de entregar cambios es `npm run typecheck` y `npm run build:web`; para cambios de UI o red hay que ejecutar el juego y probar el flujo afectado. No afirmar que se han ejecutado tests automáticos si no existen. Si se añade un runner, documentar aquí el comando y el de un único test.

## Skills y reglas de agente

Los skills viven en `.claude/skills/` (Claude Code) y se replican en `.agent/skills/` (Antigravity). La copia canónica es `.claude/skills`; después de editarla, ejecutar `node scripts/sync-agent-skills.mjs`. `AGENTS.md` contiene las reglas globales para agentes.

| Skill | Cuándo usarla | Auditoría |
|---|---|---|
| `world-determinism` | Terreno, recursos, semillas, IDs, zona segura, carves, late-join | `node .claude/skills/world-determinism/scripts/audit-world.mjs` |
| `coop-netcode` | Protocolo v11, snapshots, depósitos, escaleras, plantilla, compras | `node .claude/skills/coop-netcode/scripts/audit-netcode.mjs` |
| `balance-and-loop` | Cuotas, armas, mejoras, jetpack, escaleras, empleados, bucle de tolva | `node .claude/skills/balance-and-loop/scripts/audit-balance.mjs` |
| `hud-and-shop` | HUD, overlays, menús, tienda, pixel mode, contrato de IDs | `node .claude/skills/hud-and-shop/scripts/audit-ui.mjs` |
| `procedural-content` | Geometría, texturas canvas, materiales, instancing, dispose | `node .claude/skills/procedural-content/scripts/audit-assets.mjs` |
| `procedural-audio` | WebAudio, mute, panner, loops, gesto de usuario | `node .claude/skills/procedural-audio/scripts/audit-audio.mjs` |
| `desktop-packaging` | Electron `carbon://`, seguridad, Vite, portable | `node .claude/skills/desktop-packaging/scripts/audit-electron.mjs` |
| `save-and-roster` | localStorage v5, migración v4/v3/v2, loadout, roster | `node .claude/skills/save-and-roster/scripts/audit-save.mjs` |
| `token-economy` | Presupuestos de contexto, duplicación documental, modularización segura | `node .claude/skills/token-economy/scripts/audit-context.mjs` |

Antes de tocar un dominio, leer su `SKILL.md` y ejecutar la auditoría. Las skills no sustituyen a este archivo ni a `plan.md`: los resúmenes de arquitectura e invariantes de aquí siguen siendo la referencia. `token-economy` se usa antes de añadir módulos, documentos o skills, y al planificar la extracción de `Game.ts`.

## Arquitectura

### Punto de entrada y orquestación

- `src/main.ts` crea `Game`, arranca el bucle y muestra el overlay fatal si WebGL falla. En desarrollo expone `window.__carbonMagnateGame`.
- `src/core/Game.ts` es la composición raíz: posee el estado de partida (`RunSnapshot`), la semilla, el inventario de objetos, las escaleras, la tolva, la fase, el rol de red, la economía, el temporizador, el bucle y los delegadores. La lógica de dominio vive en módulos hermanos.
- `src/core/`: `DayCycle.ts` (día, snapshot, guardado), `DaySettlement.ts` (liquidación y bonus por rendimiento), `Combat.ts` (armas, nodos, carves, FX), `Interaction.ts` (tolva, carga, escaleras, prompt), `LadderSupport.ts` (validación de anclaje, apoyo, cruces y minerales de escaleras), `Inventory.ts` (slots, stacks y desglose por mineral), `Audio.ts` (síntesis Web Audio), `Effects.ts` (partículas y luces), `NetworkBridge.ts`/`NetworkMessages.ts` (red y late-join), `Shop.ts`/`ShopView.ts` (catálogo/compra pura y efectos), `Hud.ts`, `View.ts`, `Session.ts`, `RunState.ts`, `GameTypes.ts` y `GameConstants.ts`.
- El bucle de `Game.update()` acumula simulación a 60 Hz fija (máx. 6 pasos por frame); el render, UI, audio y efectos avanzan por frame. El anfitrión (o el modo solo) es el único que descuenta el reloj oficial del día y termina la jornada.
- Fases: `menu`, `lobby`, `playing`, `shop`, `gameover`. La victoria no es una fase propia: se representa como `shop` con `shopVictory`. Roles: `solo`, `host`, `client`.

### Mundo

- `src/world/Terrain.ts`: campo de densidad `Float32Array` de 49 × 129 × 49 muestras a 1 m (`origin` en −24, −120, −24), 4 × 16 × 4 chunks de 12 × 8 × 12 celdas, malla por Marching Cubes y cola de reconstrucción. El pozo es un **cubo macizo de 48 × 48 × 120 m, sin túnel central ni cuevas naturales**; todo hueco procede de excavaciones del jugador o la plantilla. Los límites laterales y el fondo tienen una capa de roca visible (bedrock) para que el límite del mundo no sea una pared invisible. El jugador colisiona consultando densidad interpolada, nunca raycasting contra triángulos.
- `src/world/MarchingCubes.ts`: extracción de isosuperficie low-poly con colores por triángulo y material con shader de ruido pixelado. Mantener el orden de vértices/normales: se orienta cada triángulo contra el gradiente de densidad.
- El pico industrial tiene un alcance de 5,0 m para poder picar vetas visibles al borde de una cavidad; el objetivo se valida con geometría real, no con un radio.
- `src/world/Resources.ts`: ~7.800 vetas y cofres instanciados con IDs deterministas, brillos y fractura. La densidad es alta (≈7× la versión anterior) y los nodos se colocan dentro de roca maciza; no se abren cavidades durante la generación. La rotura suelta 7–10 fragmentos (más 1–2 por golpe) y su yield se reparte entre ellos. Cada veta precalcula `hitSpheres` sobre la silueta real (icosaedro + tres astillas) para el broad-phase y el cono de ayuda. El impacto se decide lanzando un `Raycaster` contra la geometría instanciada real (`InstancedMesh.getMatrixAt`), no contra una esfera: así una veta invisible tras un muro no se convierte en objetivo. La oclusión compara la distancia al triángulo con el primer sólido del terreno (tolerancia 0,15 m para Marching Cubes). No vuelvas a un único radio esférico: las vetas enterradas solo asoman por las puntas.
- `src/world/Loot.ts`: hasta 6.000 fragmentos en `InstancedMesh`, física local, rebote, deslizamiento e imán a partir de 0,25 s. Las pepitas usan la misma receta visual que la veta: `MeshStandardMaterial` con `flatShading`, color base por instancia (`mineral.color`), emisivo por instancia (`mineral.emissive` × la intensidad de la veta) y un halo `Points` con `mineral.glow`. El emisivo por instancia se inyecta en el shader; no actives `vertexColors` en el material si la geometría no tiene atributo `color` (multiplica por negro). Los golpes a un nodo sueltan 1–2 fragmentos extra cuyo valor se descuenta del lote de rotura local. Solo las vetas de mineral/gema y el carbón sueltan loot; picar terreno normal no genera residuos recogibles. Recoger una pieza la añade al inventario; no actualiza cuota ni dinero hasta el depósito.
- `src/world/Hopper.ts`: tolva 3D de la zona segura. Su montón crece con la cuota depositada y con una fracción del valor de minerales del día; los chunks sobrantes se desbordan para exagerar el llenado.
- `src/world/Ladders.ts`: escaleras colocables con geometría compartida, replicadas por red. El stock es de equipo y persiste; las instancias colocadas se borran al regenerar el día.
- `src/world/Environment.ts`: superficie/oficina pixel art, spawn seguro, cartelería y luces. `src/world/SkyCycle.ts` gestiona el cielo atmosférico día/noche con nubes procedurales, sol/luna, estrellas y luces; `src/world/Landscape.ts` genera un heightfield FBM con montañas, bosque, rocas y vegetación alrededor del claro. El suelo exterior usa una textura de arcilla de bajo contraste y el borde del pozo un bordillo de piedra. No hay skyline urbano ni vallas metálicas. El exterior se renderiza a baja resolución y con el filtro SVG `#pixel-quantize` definido en `index.html`; bajo tierra se usa resolución completa. Fuera del área ±24 no hay terreno minable.

### Jugador, herramientas y entidades

- `src/player/Player.ts`: controlador FPS con gravedad, colisión por densidad, suelo seguro fuera del pozo, salto, jetpack bloqueado hasta `upgrades.jetpack > 0`, combustible, escalada de escaleras, head bob y teleport/spawn. `spawnAtSurface()` usa el pad seguro en `SURFACE_SPAWN`, no el terreno minable. `snapToTerrainSurface()` corrige la penetración del suelo y `tryHorizontalAxis()` permite subir el escalón de la plataforma con `STEP_HEIGHT` sin saltar.
- `src/player/ToolView.ts`: armas en primera persona. El pico es un modelo low-poly fusionado por material que se renderiza en una **escena y pass propios** con luces dedicadas y `MeshStandardMaterial` + `flatShading`; así la linterna no lo sobreexpone. Las demás armas conservan `MeshBasicMaterial`. El pico anima por fases (anticipación, golpe, impacto/rebote y recuperación), con respiración, sway y recoil. La geometría, los materiales y la curva del pico viven en `src/player/PickaxeModel.ts`; el cabezal va girado 90° (puntas en profundidad) y el pivote está en la muñeca, con una punta delantera larga.
- Granadas: ya **no son un arma**. Son objetos consumibles de `GRENADE_TIERS` (`frag`, `charge`, `breach`, `seismic`) que viven en `Inventory` y en `loadout.grenades`; se seleccionan en la hotbar y se lanzan con clic. Todas comparten `GRENADE_AREA_RADIUS` y área de daño, pero cambian `carveStrength` y `maxLayer`: la barata no fractura capas profundas. La explosión se resuelve en `Combat.explodeGrenade()` y el uso se sincroniza con `grenade_use`/`economy`.
- `src/entities/Staff.ts`: IA host-only de empleados individuales (`Loadout.employees.roster`). Todo contrato nuevo es un minero becario; cada registro conserva `id`, `kind`, `rank` y eficiencia propia. Los clientes nunca simulan empleados; solo interpolan estados. El minero nace en la superficie, comprueba cápsula/suelo y fractura vetas sin incrustarse en la roca. El recolector no pica: busca pepitas sueltas que quepan en su peso restante, las recoge de una en una, acumula hasta `COLLECTOR_CARRY_WEIGHT` (20 kg, media mochila inicial), usa la boca del pozo para no atravesar la plataforma y vuelve a la tolva al llenarse o al quedarse sin objetivos recogibles. `StaffAvatars` oculta el rig si pies, centro o cabeza están dentro de densidad sólida.
- `src/entities/Avatars.ts`: avatares remotos y de plantilla, weapon rigs, linternas de casco, etiquetas y llamas de jetpack.

### Red

- `src/network/PeerNetwork.ts` es solo transporte PeerJS: handshake, roster, host/client, envío. La lógica de juego de los mensajes vive en `Game`.
- `src/network/Protocol.ts` define `PROTOCOL_VERSION = 11`, DTOs, snapshots, límites de tamaño (512 KiB) y validadores de entrada. Incluye `deposit` con `lines` (composición por mineral), `grenade_use`, `ladder_place`/`ladder_placed` con `orientation` (`vertical`/`horizontal`/`diagonal-up`/`diagonal-down`) y `anchorId`, snapshots con escaleras, `loadout.grenades`, `dayMoneyBase` y `dayReport`, y economía con stock de escaleras y granadas. `day_result.report` alimenta la liquidación de ambos lados. Cambiar la forma de un mensaje o la generación determinista compartida implica subir la versión y el prefijo de PeerJS (`carbon-magnate-v11-`), que vive en `PEER_ID_PREFIX` de `config.ts`. La v11 añade las rampas diagonales al estado de escalera; la v10 retiró la arcilla y los escombros de roca del loot, dio dinero al carbón además de cuota y cambió la IA del recolector; la v9 añade el desglose de depósito y el informe de cierre; la v8 cortó la compatibilidad por la retirada del lanzagranadas, el inventario de objetos y `grenade_use`.
- Topología estrella: los clientes solo hablan con el host; el host agrega estados y retransmite. Ritmos actuales: estados de jugador a 20 Hz, staff a 5 Hz, economía a 4 Hz.
- El anfitrión es autoritativo para semilla, cuota, reloj, fin de día, tienda, cofres/empleados. Los clientes aplican excavación local instantánea y envían deltas; el anfitrión conserva el historial de carves y los snapshots de incorporación tardía.
- **Nunca se envían mallas.** Los eventos de excavación, IDs de nodos, `dropSeed`, estados de jugador, staff, escaleras, depósitos y compras son los mensajes de sincronización.
- Entrar a mitad de día recibe un snapshot con historial, nodos rotos, hp, estados, escaleras, stock y `dayMoneyBase`. El historial se limita a 4.000 eventos.
- El loot se simula localmente en cada cliente; no se envían posiciones de fragmentos. Al depositar en la tolva, el cliente envía `{ t:'deposit', coal, money }`; el host valida, actualiza la economía compartida y difunde `economy`. El inventario de slots es local y no viaja por red. No existe ya el mensaje `loot` de recogida inmediata.

### UI, guardado y escritorio

- `src/ui/UI.ts` exige por ID casi todos los elementos de `index.html` en el constructor. Si se elimina o renombra un elemento HTML, hay que actualizar `UI.ts` o el arranque falla. La hotbar (`inventory-hotbar`), el panel (`inventory-panel`/`inventory-grid`) y sus totales se renderizan con `InventoryView.ts`; los iconos low-poly de minerales, herramientas, escaleras y granadas viven en `MineralIcon.ts`/`ItemIcon.ts`. El panel de apuntado (`aim-panel`) muestra veta/cofre/terreno y, si se mira un cartel, su lectura en DOM (`Environment.raycastSign()`), legible incluso con el pixel mode activo. La oficina nocturna usa pestañas `Empleados / Equipo / Mejoras / Inventario` (`shopView.ts`) y la liquidación previa vive en `day-summary-overlay`; ambas comparten el contrato de IDs con `UI.ts`.
- El estilo global, HUD, menús, lobby, tienda y estética exterior se reparte en `src/styles/*.css`, importados desde `src/style.css` en orden fijo. El logo pixel art se dibuja con `src/ui/PixelLogo.ts`.
- `src/ui/format.ts` centraliza el formato español de números, dinero y tiempo.
- `src/save/SaveManager.ts` usa `localStorage` con `carbon-magnate.save.v5` y `carbon-magnate.name`; lee las claves v4, v3 y v2 antiguas como migración. Guarda el loadout (armas, mejoras, pasivas, roster individual, escaleras y granadas), el nivel de jetpack y la capacidad de carga. El inventario y su disposición de hotbar son locales y no se guardan. Los clientes online no guardan expediente; únicamente puede persistirse su nombre de operario. Al terminar un día con éxito se guarda la jornada siguiente; al fracasar se borra el expediente.
- `electron/main.cjs` sirve `dist/` bajo el esquema seguro `carbon://`, sin preload ni acceso a Node desde el renderer. El runtime del juego debe permanecer 100 % compatible con navegador. `vite.config.ts` usa `base: './'` para el empaquetado.

## Invariantes que no se deben romper

### Determinismo

1. La generación del terreno, los minerales, los cofres y `dropSeed` deriva de la semilla diaria compartida y de `mulberry32`/hash de `src/core/Rng.ts`.
2. En `DayCycle.loadSnapshot()` y en generación normal, el orden correcto es: generar terreno base → generar recursos → aplicar historial de carving → marcar nodos rotos/aplicar hp. Invertir el orden cambia la colocación de nodos y desincroniza IDs entre host y clientes.
3. Los `nodeId` incluyen el día. Nunca usar posiciones de red como identificadores de recursos.
4. El historial de red solo contiene acciones de jugadores/staff. La generación base del terreno y de los recursos es determinista y no se envía ni se registra como carve.
5. No introducir aleatoriedad con estado dependiente de red (por ejemplo, `Math.random()` en la generación del mundo). La aleatoriedad visual —chispas, rayos, rotaciones de cámara— está bien.

### Multiplayer

1. No mover lógica autoritativa al cliente: compras, cuota, fin de día, recompensas de cofres y empleados se validan/ejecutan en el host.
2. Los clientes no deben llamar a `finishDay()`, cerrar el día ni escribir guardados.
3. Mantener la regla de no enviar mallas, posiciones de fragmentos ni arrays completos de nodos por tick.
4. Si se añade/renombra un mensaje o campo, actualizar `Protocol.ts`, `NetworkMessages.ts` (`handleClientMessage`/`handleHostMessage`), `NetworkBridge.buildSnapshot`, `DayCycle.loadSnapshot` y `PROTOCOL_VERSION`.
5. Los cambios de formato de guardado requieren tratar claves anteriores o aceptar explícitamente la pérdida de expedientes; no reutilizar `v5` para otra forma.
6. La carga personal es local hasta el depósito. Vive en un inventario de objetos (`src/core/Inventory.ts`): **9 slots de hotbar + 27 de almacenamiento**, minerales apilables a 64, herramientas únicas, escaleras de equipo y granadas por tier. Recoger no acredita cuota ni dinero; depositar con `E` vacía solo los minerales y conserva herramientas, escaleras y granadas. `Inventory.breakdown()` aporta la composición por mineral del depósito. La mochila tiene un **límite de peso** (`maxCarryWeight`) que se amplía con la mejora `capacity`; al alcanzarlo o al no haber slots no se recogen más piezas. `Tab`/`I` abre el panel, libera el cursor y permite arrastrar objetos; en solo pausa el reloj.
7. El stock de escaleras es de equipo y el host lo mantiene. Al colocar, el cliente descuenta localmente y envía el evento; el host valida/descuenta y difunde `ladder_placed` + economía. Las instancias colocadas no se guardan en disco y se limpian al cargar un día. Cada escalera tiene `orientation` (`vertical`, `horizontal`, `diagonal-up` o `diagonal-down`) y un anclaje válido: pared, suelo u otra escalera; ninguna puede quedar flotando. Clic izquierdo coloca; clic derecho abre un dial central que se elige moviendo el ratón y se confirma con clic izquierdo (`Esc` o clic derecho cancela); `R` sigue ciclando como alternativa. Las diagonales son rampas transitables: si hay una escalera cerca, `findDiagonalLink()` enlaza su extremo con ella con prioridad; si no, el extremo bajo (ascendente) o alto (descendente) se apoya en el suelo. Se rechazan las rampas sin apoyo y las que atraviesan roca o la plataforma segura. Un puente puede anclarse a la cima de una vertical (`findNearestTop()`/`anchorId`), a cualquier altura de una vertical (`findNearest()`) o al extremo de otro puente (`findNearestEnd()`), y se sube a él con `W`. Al coronar se permanece en el filo, sin plataforma añadida; `findNearestTop()`/`findNearestEnd()` permiten seguir construyendo sin apuntar al punto exacto. Las verticales se trepan por ambas caras (`activeLadderSide`). `W` sube y hace manto (sin bajar más de 0,35 m); `Space` suelta la escalera y salta desde cualquier altura. `E` solo deposita. Se permiten cruces, esquinas y uniones en T; solo se rechaza que dos puentes discurran casi en la misma línea y se pisen. El fantasma solo se muestra con un anclaje; el mineral en medio invalida la colocación.
8. El jetpack solo existe a partir de `upgrades.jetpack > 0`. Mantener esta comprobación en `Player`, en la HUD y en la tienda.
9. Los empleados son registros individuales. No volver a contadores globales de mineros/recolectores sin actualizar Game, Staff, avatares, guardado y Protocol. El recolector no pica ni recoge a distancia: vuela a por pepitas, carga como máximo 20 kg y deposita al llegar a la tolva.
10. Las granadas son consumibles por tier, no `WeaponId`. Mantener el área común y variar `carveStrength`/`maxLayer`; el stock vive en `loadout.grenades` y las acciones viajan como `grenade_use`/`economy.grenades`. No permitir que un tier bajo fracture capas profundas.
11. **Liquidación autoritativa.** El dinero de los minerales se abona al depositar; el **bonus de rendimiento** se calcula solo en el cierre del host con `DaySettlement.buildDayReport()`/`dayBonusFor()`, se suma a `run.money` y `stats.moneyEarned`, y viaja en `day_result.report`. Los clientes no recalculan ni acreditan el bonus. La pantalla de liquidación muestra el desglose por mineral, el rendimiento (`carbon/quota`) y el total; la tienda rediseñada se organiza en pestañas y no altera esa contabilidad.

### Presentación

1. El exterior debe seguir siendo pixel art y natural (montañas, bosque, rocas), sin skyline urbano ni vallas; el interior es low-poly orgánico. El cambio de resolución se controla en `View.updatePixelMode()` mediante profundidad/fase y `is-pixelated` + `body.is-outside-pixel`; el render exterior apunta a 900 px internos con un tope de ratio de 0,75. El ciclo día-noche se controla con `SkyCycle.update(progress, cameraPosition, dt)`: `Game.update()` pasa 0 al empezar el día (mañana) y 1 al terminar (noche). Las luces de superficie se atenúan bajo tierra para no lavar las cuevas.
2. No añadir recursos externos (imágenes, modelos, audio, fuentes descargadas). Las texturas se generan en canvas, el audio con Web Audio y los modelos con geometría procedural.
3. La UI de juego está en español. Mantener textos, nombres de minerales/capas y mensajes coherentes con `config.ts`.
4. El HUD mantiene estado del jetpack, profundidad/capa, cuota depositada, **hotbar de 9 casillas** con herramientas, minerales, escaleras y granadas, peso/capacidad, estado de la tolva y estado online. El inventario completo (36 slots, 9×4) se abre/cierra con `Tab` o `I` (en solo libera el cursor y pausa el reloj; en online el reloj sigue); cada slot muestra icono procedural, contador `xN` y tooltip con peso/valor, y admite arrastrar/soltar. Los nuevos campos se integran en `HudViewData`; el prompt contextual de `E` para depositar y de `CLIC IZQ`/`CLIC DER` para colocar escaleras y abrir el dial central de orientación (con `G` para mostrar/ocultar el fantasma) está en `interaction-prompt`. Al apuntar a un cartel, el `aim-panel` pasa a modo lectura y muestra título y subtítulo en texto DOM nítido, aunque el cartel 3D esté pixelado o lejos. El cierre de día muestra primero la liquidación (`day-summary-*`) y luego la oficina con pestañas; la barra superior de la tienda muestra caja, próxima cuota, día, modo y estado de guardado.
5. El audio se inicializa tras un gesto del usuario (primer clic). Cualquier sonido nuevo debe respetar el mute global y, si procede, usar un panner posicional. El pico usa cuatro capas (crujido saturado, clink metálico, sub thud y pitch ±12 %); las recogidas encadenan pops de 600–1400 Hz y el depósito añade un barrido de vaciado.
6. El viewmodel se dibuja en una escena propia después del mundo (`ToolView.render()`, `clearDepth()`), con cámara y luces locales. No devolver el pico al scene principal con materiales estándar: la linterna cercana lo quema. El impacto del pico se resuelve en el mismo frame que el raycast (`updatePendingPickaxeStrike()`), y alimenta partículas, luz breve, audio y micro-shake; no separar esos tiempos.

## Flujos que conviene leer juntos

- **Ciclo de día:** `DayCycle.beginAuthorityDay()`, `loadSnapshot()`, `finishDay()`, `startNextDay()`, `saveRun()`; `DaySettlement.buildDayReport()` produce el cierre, `UI.showDaySummary()` lo muestra y `Game.openShopAfterSummary()` abre la tienda; `Game` mantiene los delegadores.
- **Red/late join:** `PeerNetwork` → `NetworkBridge.networkCallbacks()` → `NetworkMessages.handleHostMessage()`/`handleClientMessage()` → `NetworkBridge.buildSnapshot()` / `DayCycle.loadSnapshot()`.
- **Daño y rotura de nodos:** `Combat.damageNodeLocally()`, `staffAttackNode()`, `breakNodeLocally()`, `breakNodeAsHost()`, `breakNodeAsClient()`, `grantChestReward()`.
- **Tienda:** `Shop.buildShopItems()`/`applyPurchaseToRun()`, `ShopView.buildShopView()`/`requestPurchase()`/`applyPurchase()`/`broadcastShopState()` y `UI.ts`.
- **Carga/tolva:** `Interaction.onLootCollected()` (peso + `Inventory.add()`), `depositCargo()` (vacía stacks y envía `coal`/`money`), `applyTeamDeposit()`, `discardCargo()`, `Hopper.update()` y los mensajes `deposit`/`economy`.
- **Escaleras:** `Interaction.findLadderCandidate()`/`placeLadder()`, `Ladders.add()`/`showGhost()`/`findNearestTop()`/`findNearestEnd()`/`findHorizontalTop()`, `Player.updateLadderClimb()`/`tryMantle()`/`jumpOffLadder()` y los mensajes `ladder_place`/`ladder_placed`.
- **Golpe del pico:** `Combat.tryUseWeapon()` programa `pendingPickaxeStrike`; `updatePendingPickaxeStrike()` ejecuta `firePickaxe()` en el frame visual de impacto, que dispara `Effects.spawnImpact()`, `Audio.playPickaxe()` y `Player.addImpactShake()`.
- **Render exterior:** `View.updatePixelMode()`, `applyRenderResolution()`, el SVG `#pixel-quantize` y el material de `MarchingCubes.ts`.
- **Lectura de carteles:** `Environment.registerSign()`/`raycastSign()` → `Hud.updateAim()` (rayo y oclusión de terreno) → `UI.updateAim()` con `kind='sign'`; el texto vive en DOM y no sufre la cuantización.

## Verificación manual recomendada

No hay tests automáticos en el repo. Antes de cerrar un cambio, como mínimo:

1. `npm run typecheck`.
2. `npm run dev` y comprobar menú → nueva operación → movimiento → picar (incluida una veta parcialmente enterrada) → recoger fragmentos → abrir/cerrar inventario con `Tab`/`I` → mover herramientas/objetos entre slots → comprobar stack/overflow y tooltip → seleccionar escalera, colocarla con clic izquierdo y elegir su orientación en el dial central con clic derecho (incluidos un puente sobre la cima, otro a media altura de una vertical, una rampa enlazada a una escalera y el salto con `Space`) → comprar y lanzar una granada correcta para la capa → volver a la tolva → depositar → cerrar el día. Verificar que recoger no altera la cuota, que el depósito vacía solo minerales y que la liquidación muestra el desglose y el bonus; después recorrer las pestañas Empleados/Equipo/Mejoras/Inventario y comprar.
3. Para cambios de red, abrir dos ventanas/dispositivos, crear/unirse por código, entrar a mitad de día, picar, romper un nodo, colocar una escalera, depositar carga, comprobar que la liquidación del cliente coincide con la del host, comprar (incluida plantilla y granadas) y cambiar de día. En v11 ambos extremos deben usar la misma versión.
4. Para cambios de escritorio, `npm run build:win` y arrancar el portable, además de verificar que se abre con el protocolo `carbon://`.

El plan de trabajo y las prioridades pendientes están en `plan.md`. Actualizarlo cuando cambien arquitectura, protocolo, balance, estado de entrega o limitaciones conocidas.
