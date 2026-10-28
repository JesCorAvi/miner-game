# Carbon Magnate

Juego de minería 3D en primera persona para **navegador** y **Windows**, con excavación orgánica, cuotas diarias, tienda nocturna y cooperativo online de 1 a 4 operarios mediante WebRTC. El bucle temprano exige volver a la superficie y depositar la carga en una tolva corporativa: lo que no llega arriba no cuenta. Todo el arte, las partículas, los avatares y el audio se generan por código; no se usan texturas, modelos ni sonidos externos.

El **exterior** (superficie, oficina nocturna y presentación) usa una dirección de arte **pixel art** y natural: render interno reducido (objetivo de ~900 px) con escalado *nearest-neighbor*, cuantización de color, cielo atmosférico con nubes procedurales, montañas y bosque low-poly, y un ciclo día-noche que va de mañana a noche durante el turno. El **interior del pozo** mantiene el estilo 3D orgánico low-poly. Los carteles de la superficie tienen tipografía de gran formato y, al apuntarlos, muestran su lectura en un panel nítido con la distancia: se pueden leer desde el otro extremo del claro sin perder el pixelado.

## Características

- Pozo determinista de **48 × 48 × 240 m** con **12 biomas en 20 niveles de 12 m**, campo de densidad 3D y **Marching Cubes** por chunks.
- Excavación esférica en tiempo real con reconstrucción de chunks y colisiones O(1) consultando la densidad.
- **Cubo macizo, sin túnel central ni cuevas naturales**: todo hueco lo abre el jugador o la plantilla. El pico industrial talla cráteres compactos; el taladro y los explosivos abren cavidades mayores.
- Vetas instanciadas de **12 carbones y 24 minerales de capital** repartidos por los 12 biomas, además de cofres con botín por nivel (1–12): pasiva, gema o pergamino de equipo. **Más de 10.000 nodos** cambian de sitio cada día; casi cualquier túnel acaba revelando mineral. Las vetas usan raycast sobre su geometría real y una pequeña asistencia de puntería para que las astillas visibles se puedan picar sin enganchar vetas ocultas tras un muro.
- **Mochila con hotbar e inventario**: 9 casillas de hotbar y 27 de almacenamiento; los fragmentos se apilan por mineral (máximo 64), las herramientas compradas aparecen como objetos movibles y las escaleras/granadas se seleccionan desde la hotbar. El panel se abre con `Tab` o `I` y permite arrastrar objetos entre casillas.
- Loot físico instanciado (hasta 6.000 fragmentos) con gravedad, rebote, deslizamiento e imán. Los fragmentos usan el mismo material y brillo que la veta del mineral, para que se reconozcan sin volver a negro. La rotura de un nodo suelta 7–10 piezas y cada golpe añade chips; picar roca o arcilla no genera residuos recogibles.
- Arsenal de **22 familias de armas** con tiers y recompra: picos, picos eléctricos, pistolas, escopetas, rifles, miniguns, hachas, hachas orbitales, guantes, patadas, bastones mágicos, orbes, jets, tanques, lanzallamas, armas de veneno, armas de agua, morteros, taladros y sísmicos. Las granadas son objetos consumibles de cuatro tiers, con la misma área pero distinta potencia de capa.
- **Topologías de pozo**: Estándar, Embudo de Extracción, Embudo Estrecho, Mina Celeste (pozo abierto vertical), Estrato Superficial (120 m), Mina Dispersa y Cielo Disperso. Se eligen en el menú y cambian la densidad real del terreno y la distribución de recursos.
- **13 profesiones de expedición** (Becario, Chamán, Pistolero, Arcano, Bárbaro, Solitario, Demoledor, Hidrógrafo, Piloto, Leñador, Destructor, Mula y Generalista) con ventajas y prohibiciones que cambian la tienda, la capacidad, el jetpack y el daño. La profesión se elige en el menú y la fija el anfitrión en cooperativo.
- **Game feel de minería:** pico low-poly con cabezal orientado en profundidad y pivote en la muñeca, animado por fases con anticipación, golpe y rebote; fragmentos físicos, chispas metálicas, luz de impacto breve, micro-shake de cámara y audio multicapa con pitch variable.
- **Jetpack desbloqueable en fase avanzada**, con combustible y recarga en suelo. Al principio el jugador debe volver usando escaleras.
- **Zona segura no minable** sobre la excavación: punto de aparición, spawn pad, oficina y tolva, rodeada de montañas y bosque natural en lugar de vallas o ciudad.
- **Tolva física**: la carga personal (carbón y valor de minerales) solo cuenta al pulsar `E` junto a ella; el montón crece, se desborda y se ilumina según lo depositado.
- **Escaleras baratas y consumibles**: se compran por lotes en la oficina nocturna, se colocan con **clic izquierdo**, se orientan con el **dial central de clic derecho** (vertical, rampa ascendente, puente o rampa descendente, elegido moviendo el ratón) y se suben con `W` desde cualquiera de sus dos caras. `G` muestra u oculta el fantasma; se anclan a paredes, suelo, otras escaleras o a cualquier altura de una vertical, pueden apilarse y se consumen del inventario del equipo. `Space` suelta la escalera y salta. Al coronar puedes quedarte en el filo (sin plataforma) y seguir colocando hacia arriba, a los lados o desde el extremo de un puente; los tramos se combinan en cruces, esquinas y T. Las diagonales son rampas transitables: enlazan con prioridad su extremo a una escalera cercana y, si no, lo apoyan en el suelo; ninguna escalera puede quedar flotando.
- Ciclo diario de 90 s ampliable, cuota obligatoria escalada por número de jugadores y regeneración total del pozo con nueva semilla.
- **Modos y cláusulas**: Jornada Normal, Arranque Duro (cuota ×0,5) y Operación en Paz (cuota 0), más seis modificadores combinables (SIN COFRES, SOLO CARBÓN, CARBÓN SIN VALOR, SIN BONUS, SIN TIEMPO EXTRA, SOLO ARCILLA). La victoria estándar llega en el día 15 y el final verdadero en el 25; desde el 26 la operación es infinita.
- **Progresión Coal LLC**: 15 tiers de pico (Deficiente → Ónice), 31 pasivas con curva de cofre L/L² y topes visibles, y minerales cuya ley $/HP crece con la profundidad mientras la del carbón cae.
- Capas de dureza y riqueza: **12 biomas en 20 niveles**, desde arcilla ocre hasta el azul abisal, con escala de HP de ×1 a ×10²⁹.
- Empleados IA con identidad propia: **todo contrato nuevo empieza como minero becario**. Cada trabajador puede ascender individualmente o reconvertirse en recolector; el anfitrión simula y sincroniza la plantilla. Los mineros se ajustan al suelo para no incrustarse en la roca; los recolectores entran y salen del pozo por la boca y vuelven a la tolva al llenarse o al no encontrar más pepitas que quepan.
- **Cierre de turno y liquidación**: al terminar el día se muestra el desglose de minerales vendidos, el rendimiento sobre la cuota y un bonus variable; después se abre la oficina nocturna.
- **Tienda por pestañas** (Empleados, Equipo, Mejoras, Inventario) con barra de caja, próxima cuota, día, modo y estado de guardado. Se compran armas, mejoras, escaleras, granadas, contrataciones y ascensos. Guardado automático en `localStorage`.
- Cooperativo P2P 1–4 por **código de sala de 6 caracteres** con PeerJS/WebRTC. Funciona entre navegador y el `.exe`.
- Sincronización determinista por semilla, eventos de excavación, rotura de nodos, carga/depósitos, escaleras y estados de jugador a 20 Hz con interpolación.
- Audio 100 % procedural mediante Web Audio API, con paneo 3D posicional para los sonidos del escuadrón. El pico mezcla crujido de roca, clink metálico, cuerpo grave y pops cristalinos al recoger.

## Controles

| Entrada | Acción |
| --- | --- |
| `WASD` | Desplazamiento |
| `Shift` | Correr |
| Ratón | Mirar; apuntar a un cartel muestra su lectura y distancia en el panel de apuntado |
| Clic izquierdo | Excavar / usar herramienta / lanzar granada; con una escalera seleccionada, colocar el tramo |
| Clic derecho | Abrir el dial central de escalera y elegir con el ratón: vertical, rampa ascendente, puente o rampa descendente. Clic izquierdo confirma; otro clic derecho cancela |
| `E` | Depositar carga en la tolva / usar cabria (8 m/s) / almacenar o retirar en tolva de campaña |
| `C` | Mostrar / ocultar plano topográfico de galerías |
| `Q` | Colocar baliza de señalización en pared o suelo |
| `R` | Ciclar la orientación de escalera (alternativa a clic derecho) |
| `G` | Mostrar/ocultar el modo de colocación de escaleras |
| `W` junto a una escalera | Subir desde cualquiera de las dos caras; en la cima, manto o subir a un puente; `S` baja; `A`/`D` suelta |
| `Espacio` | Saltar; en una escalera se suelta y salta desde cualquier altura; propulsar el jetpack cuando esté desbloqueado |
| `1`–`9` | Seleccionar casilla de la hotbar |
| Rueda | Cambiar de casilla de la hotbar |
| `M` | Silenciar / activar audio |
| `Tab` o `I` | Abrir/cerrar inventario (libera el cursor) |
| `Esc` | Pausa / liberar ratón |
| Menú principal | Elegir modo de jornada y cláusulas antes de **Nueva Operación**; el anfitrión fija la configuración de la sala |

## Ejecutar

Requiere Node.js 22.12 o superior.

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite, normalmente `http://127.0.0.1:5173`.

### Windows / Electron

```bash
npm run electron:dev    # desarrollo con Vite + Electron
npm run electron:preview# compila la web y abre Electron
npm run build:win       # genera el .exe portable
```

El ejecutable se genera en `release/CarbonMagnate-2.0.0-portable.exe`.

### Tests automatizados y E2E

```bash
npm test                # 148 tests con Vitest (balance, determinismo, migración, física)
npm test -- <archivo>   # ejecutar suite específica
npm run test:e2e        # prueba E2E headless en Electron y remojo de 10 días (detección de fugas)
npm run typecheck       # validación de tipos estricta con TypeScript
```

### Compilación web

```bash
npm run build:web
```

La salida queda en `dist/`.

### GitHub Pages

El repositorio incluye el flujo `.github/workflows/deploy-pages.yml`, que compila y publica `dist/` en GitHub Pages al hacer push a `main` (o al lanzarlo manualmente).

1. En GitHub, abre **Settings → Pages**.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Haz push a `main` y espera a que termine el workflow **Publicar en GitHub Pages**.

La URL será `https://<usuario>.github.io/<repositorio>/`. `vite.config.ts` mantiene `base: './'`, así que los assets funcionan igual en un subdirectorio de Pages, en `npm run preview` y bajo `carbon://` en Electron. La página se sirve por HTTPS, que es lo que necesitan PeerJS, el portapapeles y el pointer lock; también se publica `.nojekyll` por si el artefacto se sirve desde una rama.

## Multijugador

1. Un operario pulsa **Crear sala**. La aplicación abre una sala P2P y muestra un código de 6 caracteres.
2. El resto entra desde **Unirse** con ese código, tanto en navegador como en el ejecutable de Windows.
3. El anfitrión inicia el turno y reparte la semilla diaria. El mundo es idéntico en todos los clientes.
4. Las excavaciones, golpes, roturas, depósitos en la tolva, escaleras, compras y eventos de FX viajan por la red; las mallas nunca se envían.
5. Cada operario deposita su propia carga en la tolva. La economía, la cuota y el nivel visual de la tolva son compartidos.

La señalización usa el servicio público de PeerJS y servidores STUN/TURN públicos. Una red corporativa extremadamente restrictiva puede requerir configurar infraestructura TURN propia en `src/network/PeerNetwork.ts`. El anfitrión es autoritativo: si se desconecta, la sesión termina.

## Estructura del proyecto

```
src/
  config.ts                 Constantes, minerales, armas, capas y economía
  types.ts                  Tipos compartidos
  main.ts                   Arranque y manejo fatal
  core/
    Game.ts                 Composición raíz: estado, bucle y delegadores
    DayCycle.ts             Ciclo de día, snapshot y guardado
    Combat.ts               Armas, nodos, carves y efectos
    Interaction.ts          Tolva, carga, escaleras y prompt
    Inventory.ts            Slots, stacks y totales de la mochila
    NetworkBridge.ts        Callbacks, snapshots y ticks de red
    NetworkMessages.ts      Handlers de mensajes host/cliente
    Shop.ts                 Catálogo puro de tienda y validación de compras
    ShopView.ts             Vista de tienda y efectos de compra
    Hud.ts                  HudViewData, aim y objetivo
    View.ts                 Cámara, pixel mode y resolución
    Session.ts              Menú, lobby, controles y sesión
    RunState.ts             Helpers de RunSnapshot y loadout
    GameTypes.ts            Tipos internos del orquestador
    GameConstants.ts        Constantes del bucle y de red
    Rng.ts                  PRNG y ruido determinista
    Input.ts                Ratón con pointer lock y teclado
    Audio.ts                Sintetizador y paneo 3D
    Effects.ts               Partículas, rayos, explosiones y polvo
  world/
    MarchingCubes.ts        Extractores de isosuperficie y material con shader pixel
    Terrain.ts              Campo de densidad, chunks, colisiones y raycast
    Resources.ts            Vetas instanciadas, cofres y brillos
    Loot.ts                 Pepitas físicas instanciadas e imán
    Environment.ts          Exterior pixel art, zona segura y oficina corporativa
    SkyCycle.ts             Cielo atmosférico, nubes, sol/luna, estrellas, niebla y luces
    Landscape.ts            Heightfield de montañas, bosque, rocas y vegetación
    Hopper.ts               Tolva 3D con llenado exagerado y efecto de depósito
    Ladders.ts              Escaleras colocables, replicadas y trepables
  player/
    Player.ts               Controlador FPS, suelo seguro, escalada y jetpack
    ToolView.ts             Armas en primera persona y animación por fases
    PickaxeModel.ts         Geometría low-poly del pico, materiales y curva de golpe
  entities/
    Staff.ts                IA de plantilla individual (mineros/recolectores)
    Avatars.ts              Avatares remotos y de plantilla
  network/
    PeerNetwork.ts          Transporte PeerJS host/cliente
    Protocol.ts             Mensajes, validación y snapshot del día
  ui/                       HUD, menús, lobby, oficina nocturna, inventario e iconos
  save/SaveManager.ts       Persistencia local
electron/
  main.cjs                  Ventana de escritorio y protocolo seguro
```

## Notas técnicas

- **Render exterior pixel art:** cuando el operario está en la superficie o en pantallas de oficina, el canvas se renderiza a una resolución interna menor, con filtro de cuantización y texturas nearest-neighbor. El cielo atmosférico, las nubes, la niebla y las luces cambian con el progreso del turno: mañana al empezar y noche al terminar. Bajo tierra se recupera la resolución completa y la iluminación de casco.
- **Determinismo:** cada día deriva de `mulberry32` con semillas independientes para terreno, vetas, cofres y drops. La generación de recursos se ejecuta antes de reaplicar el historial de excavación para que los `nodeId` coincidan también en incorporaciones tardías.
- **Zona segura:** la superficie alrededor del pozo está fuera del campo minable; no se puede excavar ni colocar minas allí. El jugador aparece en ella y vuelve a ella para depositar y comprar entre turnos.
- **Red:** el anfitrión mantiene la lista de eventos `CARVE`, hp de nodos, cofres abiertos, escaleras, economía, temporizador y personal. Los clientes aplican excavación local inmediata y envían deltas; el historial permite reconstruir el túnel a quien entra a mitad de día.
- **Carga y tolva:** la recogida de fragmentos suma a un inventario local con peso limitado que no altera cuota ni dinero. Al depositar, el cliente envía un `deposit` con la composición por mineral al host; la tolva y la economía se actualizan para todo el equipo. Los recolectores IA no pican ni succionan: vuelan a por pepitas, cargan hasta 20 kg y las entregan al llegar a la tolva, sin atravesar la plataforma exterior. El carbón suma a la cuota y también paga dinero.
- **Liquidación:** el host suma el valor de los minerales depositados y un bonus por rendimiento (`cuota cubierta` y excedente) al cerrar el día. La pantalla de cierre desglosa cada mineral y el total; después se abre la tienda. El protocolo v16 transporta `lines` en el depósito, `report` en `day_result`, modo/modificadores/topología, orientaciones de escalera (incluidas las rampas diagonales), cabrias, tolvas de campaña, balizas de sector, brigadas, cintas y cota de plataforma de servicios (`platformDepth`); ambos extremos deben usar la misma versión.
- **Escaleras:** stock compartido y persistente. Cada colocación consume una unidad y produce un evento de red; las escaleras colocadas desaparecen al regenerar el pozo, pero el stock comprado permanece. Las rampas diagonales se enlazan al extremo o al tramo de una escalera cercana y, si no la hay, apoyan su extremo inferior/superior en el suelo; ninguna escalera queda flotando. El jetpack es una compra de fase avanzada.
- **Loot e inventario:** cada fragmento recogido entra en una casilla apilable; la carga no acredita cuota ni dinero hasta depositar en la tolva. Los slots muestran icono procedural, contador, peso y valor al pasar el ratón, y se pulsan al recibir piezas.
- **Audio:** no hay archivos de sonido; el sintetizador crea impactos multicapa, explosiones, pasos, pops de recogida y drones de ambiente.
- **Guardado:** se guarda automáticamente al iniciar cada día, cada 12 s, al comprar o abandonar desde la oficina. Los expedientes se retoman desde el menú. Los clientes online no guardan el expediente.
- **Persistencia actual:** clave `carbon-magnate.save.v9`, que conserva loadout, 22 familias con su tier, 31 pasivas de cofre, 13 profesiones, topología de pozo, plantilla individual y brigadas de sector, stock de escaleras, granadas compradas, cabrias, tolvas de campaña, balizas, módulos de cinta, actas de operación, patentes I–VI, tier de pico, modo/modificadores, cota de plataforma (`platformDepth`), fondo de reserva y opciones de accesibilidad. Se leen las claves v8, v7, v6, v5, v4, v3 y v2 antiguas como migración.

## Documentación de desarrollo

- `CLAUDE.md`: guía operativa y arquitectura para futuras sesiones de Claude Code.
- `plan.md`: diseño detallado, estado de entrega, invariantes, deuda técnica y roadmap.

## Licencia y derechos

Nombre, código y arte procedural originales de este proyecto. No se han incluido recursos de terceros. La adaptación de mecánicas de minería y cuotas es una interpretación propia y no reproduce activos, nombres, música ni interfaces de otros juegos.
