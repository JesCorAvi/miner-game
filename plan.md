# Plan de proyecto — Carbon Magnate

> **Estado:** jugable y empaquetado, versión `2.0.0`.
> **Última actualización:** 2026-10-28.
> **Rumbo Coal LLC 3D (2026-10-28):** Fase 1 jugable sobre el pozo de 240 m: 12 biomas/20 niveles, 36 minerales, 31 pasivas, cofres 1–12, 15 tiers de pico, modos Normal/Arranque Duro/Operación en Paz, 6 modificadores, cuotas hasta el día 30, victoria 15/25, guardado v9 y protocolo v15. **Fase 2A añadida:** 22 familias de armas con tiers/recompra y 13 profesiones con bonificaciones y prohibiciones. **Fase 2B añadida:** 7 topologías de pozo con generación real, encargos de galería con módulos de servicio y certificaciones, y comportamientos únicos de proyectil, órbita y onda sísmica (protocolo v17). **Fase 3A añadida:** Compactador de Carga (+32/stack, 12 niveles) y Bahía de Carga ampliada a 520 kg. **Pendiente:** brigadas masivas, cintas de retorno completas, `BigValue` real y balance fino de endgame.
> **Documentos relacionados:** `README.md` (uso), `CLAUDE.md` (guía operativa para agentes).
> **Plan de actuación 3D:** `PLAN_DE_ACTUACION_3D.md` (plan anterior; varias casillas de la Fase 3 siguen sin marcar y no debe citarse como “100 % implementado”).
> **Fase 6B — Overlay de Perfilado de 16,6 ms, Instrumentación Local y Harness Cooperativo P2P (2026-10-28):**
>   - **Overlay de Desarrollo y Presupuesto de 16,6 ms (`PerfOverlay.ts`, `Game.ts`):** Módulo local sin telemetría externa activable con `F3` / `` ` `` o `?perf=1`. Mide en tiempo real la descomposición de presupuesto a 60 fps: Render (≤ 8,0 ms), Terreno (≤ 2,5 ms, cola de chunks), Loot (≤ 1,5 ms, activos, fusionados, libro de exceso), Plantilla (≤ 1,5 ms, rigs, siluetas, brigadas), Efectos (≤ 1,0 ms, tokens sensoriales), Audio (≤ 0,5 ms, voces activas y posicionales) y UI/DOM (≤ 0,8 ms). Muestra geometrías, triángulos, tamaño de snapshot en KiB, viajes a tolva y error de ReturnPlanner.
>   - **Degradación Automática Vinculada al Presupuesto (`Terrain.ts`, `PresentationBudget.ts`, `Loot.ts`):** Ante caídas sostenidas por debajo de 60 fps (> 16,6 ms), reduce dinámicamente la reconstrucción de terreno (2 chunks/frame), reduce tokens sensoriales (60 tokens) y compacta LOD de física de loot y plantilla, mostrando indicador discreto en UI (`[PERF: DEGRADACIÓN DINÁMICA ACTIVA]`) que se restablece al normalizarse el frame time.
>   - **Harness Cooperativo P2P y Late Join a Dos Ventanas (`tests/p2p-coop-harness.test.ts`):** Validación en 2 instancias de sincronización de excavación, rotura de nodos, cabrias, tolvas de campaña, cintas, balizas y brigadas. Prueba de estrés de late join en Día 10 avanzado con 8.000 carves comprimidos: snapshot de red `< 512 KiB` y reconstrucción determinista idéntica bit a bit en `< 5 s` (ejecutado en < 400 ms).
>   - **Validación completa:** 155 tests pasando en Vitest (24 suites), `npm run typecheck`, `npm run build:web` y `npm run test:e2e` limpios. Las auditorías estáticas están actualizadas a los presupuestos de 240 m, v9 y v17.
> **Fase 6A — Auditoría de Integridad ("Cero Stubs") y Certificaciones de Campo (2026-10-28):**
>   - **4 Certificaciones de campo y 2 Ranuras de utilidad (`Progression.ts`, `types.ts`, `Shop.ts`, `ShopSideView.ts`):** `dust_filter` (suprime niebla espesa), `gallery_map` (vector guía a tolva y resaltado de túneles), `vein_probe` (escáner ampliado +2,5 m e indicador en HUD) y `rappel_harness` (suprime penalización por lastre y 0 % pérdida en aterrizajes duros). Gestión en oficina con 2 ranuras de utilidad activas y persistidas en `Loadout`.
>   - **Mecánicas activas de Actas y Cláusulas:** `crew` penaliza mochila (−25 %) y promueve al minero contratado a rango 1 preservando la invariante; `freight` expande tolva de campaña (+50 %); `precision` bonifica mochila (+25 %); `surprise_audit` y `short_shift` aplican multiplicadores reales de liquidación en `DaySettlement.ts`.
>   - **Determinismo estricto:** Eliminación de `Math.random()` en `Brigades.ts` en favor de `hashString`.
>   - **Validación completa:** 127 tests pasando en Vitest (18 suites), 0 errores y 0 warnings en las 9 auditorías estáticas, `npm run build:web` limpio.
> **Fase 5B — Cierre de Deuda Técnica, Plataforma Móvil, Auditoría de las 9 Skills y Build de Producción (2026-10-28):**
>   - **Plataforma de Servicios Móvil y Tapón de Estéril (`Environment.ts`, `Hopper.ts`, `Shop.ts`, `Player.ts`, `DayCycle.ts`):** Firma del **Acta de cierre** (`closure_act`) en la oficina nocturna tras alcanzar la cota de capa, sellando los túneles superiores con un tapón de estéril visible (`spoilPlugMesh`) y descendiendo la plataforma de servicios (`mobileDeckMesh` a `platformDepth` en incrementos de 25 m hasta 75 m). Sincronizado en `DaySnapshot` (protocolo v14) y en guardado v8 (`platformDepth`), reubicando tolva y retorno dentro de la cota activa.
>   - **0 Métodos de audio sin uso (`Audio.ts`, `DayCycle.ts`):** Conectado `playVictory()` al superar el hito del Día 15 (victoria corporativa estándar) y Día 25 (operación ilimitada).
>   - **Presupuesto de contexto y modularización estricta (`audit-context.mjs`):** Extracción de `LobbyView.ts` y `FloatingNoticeView.ts` desde `UI.ts` (862 líneas ≤ 900), extracción de `hud-overlays.css` desde `hud.css` (1041 líneas ≤ 1200), y compactación de `index.html` (599 líneas ≤ 600). Todos los archivos TS cumplen `≤ 900` líneas, CSS `≤ 1200` y HTML `≤ 600`.
>   - **Auditoría de las 9 Skills 100 % limpia:** Las 9 auditorías estáticas (`world-determinism`, `coop-netcode`, `balance-and-loop`, `hud-and-shop`, `procedural-content`, `procedural-audio`, `desktop-packaging`, `save-and-roster`, `token-economy`) pasan con exactamente **0 errores y 0 warnings**. Sincronizado `.agent/skills/` con `.claude/skills/`.
>   - **Validación de producción:** `npm run typecheck`, `npm test` (17 archivos, 115 tests), `npm run build:web` y `npm run build:win` superados. 100 % procedural sin dependencias externas.
> **Fase 5A — Simulación de Balance Días 1–30, Smoke E2E y Harness de Rendimiento (2026-10-28):**
>   - **Simulador de Balance Automatizado Días 1–30 (`tests/balance-sim.test.ts`):** Simulación determinista sin render de partidas completas Días 1 a 30 con las 4 Actas de operación (*Voladura*, *Cuadrilla*, *Precisión*, *Flete*), verificando:
>     - **Viajes a la tolva:** 1–2 viajes en los Días 1–5 (cuotas 40–580 t con mochila de 40–60 kg); 2–3 viajes en Días 10–15 (cuotas 5.000–40.000 t con asistencia de depósitos, cintas y brigadas).
>     - **Precisión del reloj de retorno (`ReturnPlanner`):** Error relativo ≤ 12 % respecto al tiempo real de recorrido (umbral de éxito ≤ 20 %).
>     - **Dispersión entre Actas:** Diferencia de win rate ≤ 10 puntos porcentuales en Día 15 (todas superan el 80 % de éxito sin ninguna doctrina rota ni inútil).
>     - **Escalado en Modo Infinito (Días 16–30):** Día 25 exigente pero alcanzable (~1M t de cuota con build completa) y Día 30 manejando millones limpiamente en `BigValue` sin pérdida de precisión ni valores inválidos.
>   - **Tests de Determinismo, Snapshot y Migración Completa (`tests/determinism-and-migration.test.ts`):**
>     - Orden estricto de generación determinista (`terreno -> módulos -> recursos -> carves -> nodos`) verificado bit a bit entre host y cliente con semillas fijas.
>     - Snapshot de partida avanzada de 10 días con 4 jugadores, 4 brigadas, 30 módulos de cinta y 8.000 eventos de carve comprimidos con un tamaño de 56 KiB (muy inferior al límite de 512 KiB) y restauración en < 50 ms (meta < 5 s).
>     - Migración completa de guardado en cadena `v5 -> v6 -> v7 -> v8` soportando campos ausentes y datos corruptos sin pérdida de cuota, dinero, inventario ni registros de plantilla.
>   - **Harness E2E y Detección de Fugas de Memoria (`scripts/smoke-e2e.cjs`, `npm run test:e2e`):**
>     - Bucle completo automatizado en Electron headless: `Menú -> Día 1 -> excavar -> recoger -> volver a tolva -> depositar con E -> liquidación (Acta de extracción) -> oficina/tienda -> Día 2`.
>     - Prueba de remojo de 10 días midiendo `renderer.info.memory.geometries` y `textures`: exactamente 82 geometrías estables a lo largo de los 10 días (0 fugas de memoria).
>   - **Validación global:** 115 tests pasando en Vitest a lo largo de 17 suites (`npm test`).
> **Fase 4B — BigValue, Modo Libro Mayor, Brigadas Estadísticas, Cintas de Retorno, Huella Ambiental, Protocolo v14 y Guardado v8 (2026-10-27):**
>   - **Aritmética de alta precisión y Modo Libro Mayor (`BigValue.ts`, `format.ts`, `LedgerModeView.ts`):** `BigValue` normalizado (mantisa \(1 \le |m| < 10\) + exponente entero). Cuota, capital, estadísticas acumuladas y liquidación migradas a BigValue (manteniendo tiempos y radios en `number`). Tabla de formato en español: `< 10.000` con separador de millares, `10.000–999.999` en `k`, `1e6–1e9` en `M`, `1e9–1e12` en `MM` (miles de millones) y `≥ 1e12` en notación científica `1,23×10¹²`. Conmutador de **Modo Libro Mayor** en oficina y liquidación para alternar cifras exactas y abreviadas sin pérdida de precisión.
>   - **Simulación híbrida de plantilla y brigadas (`Brigades.ts`, `Avatars.ts`, `BrigadeModal.ts`):** Hasta 6 supervisores individuales (`EmployeeRecord`) + hasta 4 brigadas estadísticas (`BrigadeRecord`) desplegadas en balizas de sector (`SectorBeacon`, radio 8 m). Simulación multinivel (LOD cerca ≤ 40 m con avatares completos, medio 40–100 m con 64 siluetas instanciadas en `crowdMesh`, y lejos > 100 m con throughput estadístico determinista ejecutado en host cada segundo).
>   - **Cintas transportadoras de retorno (`Conveyors.ts`, `ConveyorOverlay.ts`):** Módulos instanciados de 3 m sobre suelo/pendientes suaves (límite duro de 32 módulos). Atracción horizontal de pellets a 2 m, arrastre direccional a 3,5 m/s hacia tolvas, detección automática de atascos si el terreno sólido bloquea la línea y banner de alerta en el HUD (`#conveyor-jam-banner`).
>   - **Huella ambiental visible en superficie (Etapas 0–4):** `Environment.ts`, `Landscape.ts` y `SkyCycle.ts` reaccionan deterministamente según el día de la campaña (Etapa 0 días 1–3 "OPERACIÓN INICIAL", Etapa 1 días 4–7 escombros y "RÉCORD DE EXTRACCIÓN", Etapa 2 días 8–12 árboles secos y "ZONA EN REVISIÓN", Etapa 3 días 13–15 cráter y "ZONA DE SACRIFICIO", Etapa 4 día 16+ niebla densa y "OPERACIÓN ILIMITADA"). Aplicación en < 1 ms de CPU al iniciar turno.
>   - **Arquitectura de red y guardado:** Sube a **Protocolo v14** (`PEER_ID_PREFIX = 'carbon-magnate-v14-'`) con mensajes `sector_place`, `belt_place`, `brigade_state`, `belt_state`, y valores BigValue como strings en snapshots/liquidación. Sube a **Guardado v8** (`carbon-magnate.save.v8`) con migración limpia y retrocompatible desde v7, v6, v5, v4, v3 y v2.
>   - **Tests unitarios y remojo:** 108 tests en Vitest en 15 suites, incluyendo prueba de remojo de 10 días (`soak-simulation.test.ts`), validación de cuotas, throughput de brigadas, cintas y verificación de tamaño de mensaje (< 64 KiB, muy inferior al tope de 512 KiB).
> **Fase 4A — Optimización masiva de terreno, loot con spatial hash/fusión y presupuesto sensorial (2026-10-27):**
>   - **Sistema de Loot optimizado (`LootSpatialHash.ts`, `LootTypes.ts`, `LootAssets.ts`, `Loot.ts`):** Spatial hash con celdas de 2 m (aceleración O(1) en recogida e IA de empleados), presupuesto duro de 1.500 pellets físicos activos, 1.500 visibles y 400 montones fusionados, con LOD físico por distancia (60 Hz < 24 m, 10 Hz 24–48 m, 0 Hz > 48 m congelando matriz).
>   - **Fusión dinámica de pellets:** Fusión periódica (0,5 s o al superar 1.200 activos) de pellets del mismo mineral a < 1,5 m. Conserva el 100 % del yield (carbon, money, weight, count y desglose de líneas) con escala visual cúbica topada a 2,2×.
>   - **Libro de exceso (`overflowLedger`):** Garantiza que `findSlot()` jamás sobrescriba un pellet activo; si se agotan los slots libres, el yield se acumula sin pérdida y se recolecta en proximidad (2,8 m).
>   - **Modo granel:** Desbloqueo y conmutación en oficina/ajustes para acreditar el yield de nodos rotos directamente a la mochila virtual evitando la creación de entidades físicas individuales (excepto cofres).
>   - **Terreno optimizado (`Terrain.ts`, `TerrainCarveCompressor.ts`):** Conteo incremental de sólidos en O(1) eliminando el escaneo de 309.729 celdas en cada carve. Carves por lotes por tick y reconstrucción presupuestada a 4 chunks/frame (2 en frames lentos) priorizando la frustum y distancia al jugador. Compresor de historial de carves cuantizado a 7 bytes con capacidad de 8.000 eventos dentro de 96 KiB.
>   - **Presupuesto sensorial y temblor por trauma (`PresentationBudget.ts`, `TraumaSystem.ts`, `Effects.ts`, `Audio.ts`, `Player.ts`):** 120 tokens/frame (60 en explosiones masivas) limitando chispas, escombros, luces de explosión (máx 2) y audio (máx 24 voces, 12 posicionales; ducking ambiental de 1,4–1,8 s; estrangulamiento de impactos de pico a 30 ms). Sistema de cámara basado en trauma (0–1, decaimiento a 2,5/s, amplitud `trauma²`, topes de 0,2 en minado y 0,6 en explosión normal; nulo a > 40 m).
>   - **Modal de Accesibilidad (`AccessibilityModal.ts`):** Configuración desacoplada y persistente en `SaveManager` para intensidad de temblor (0 %, 50 %, 100 %), campo de visión (FOV de 60° a 100°) y conmutador de Modo Granel.
>   - **Tests unitarios:** 91 tests en Vitest cubriendo spatial hash, fusión dinámica, libro de exceso, conteo incremental de sólidos, compresión de terreno, presupuesto sensorial y decaimiento de trauma.
> **Fase 3A — Motor matemático, Patentes, Conversión de excedentes, Actas y Cláusulas (2026-10-27):**
>   - **Patentes corporativas I–VI (`Progression.ts`, `Shop.ts`, `ToolView.ts`):** Cada patente multiplica el daño de minado ×2,4 y la potencia de excavación ×1,8 con coste escalonado ×4,2 y requisito de romper nodos en la capa correspondiente. Actualiza emisivo de la herramienta, tono de impacto acústico y partículas.
>   - **Curva cuadrática y conversión de excedentes (`OVERFLOW`):** Pasivas con fórmula cuadrática `bruto(L) = 1 + 0.06L + 0.004L²` topadas en 6,0. El excedente no se desperdicia: cadencia → daño por golpe, radio de excavación → fractura dirigida a nodos, imán → radio de auto-recogida, velocidad de empleados → rendimiento de plantilla, capacidad → velocidad con lastre, combustible de jetpack → recarga en suelo. Avisos en la oficina: `MÁXIMO · EXCEDENTE → BENEFICIO`.
>   - **Radio cúbico y cargas conformadas:** Radio efectivo con raíz cúbica y topes duros (pico 1,0 m, taladro 1,6 m, escopeta 2,5 m, granada 4,0 m); el exceso de radio se convierte en fractura secundaria mediante logaritmo. Soporte para formas conformadas en granadas (cápsula y cono orientados).
>   - **Fondo de reserva corporativo:** Opción de almacenar el excedente de carbón para amortizar hasta el 20 % de la cuota del día siguiente en lugar de canjearlo por capital inmediato.
>   - **Actas de operación (Doctrinas de equipo):** 4 arquetipos asimétricos (*Acta de Voladura*, *Acta de Cuadrilla*, *Acta de Precisión*, *Acta de Flete*) con prohibiciones estrictas aplicadas en tienda y gameplay (prohibición de jetpack, empleados, mineros o escáneres).
>   - **Cláusulas de la junta:** 6 modificadores opcionales combinables (*Auditoría sorpresa*, *Corte de suministros*, *Estrato sellado*, *Polvo en suspensión*, *Turno corto*, *Mina espejo*).
>   - **UI Modular:** Creados `DoctrineModal.ts` y `ShopSideView.ts` con contrato de IDs, reduciendo el tamaño de `UI.ts` y `Game.ts` sin inflar archivos centrales.
>   - **Tests unitarios:** 76 tests en Vitest cubriendo progresión, curva cuadrática, topes, patentes, desbordamiento, actas, cláusulas y reserva corporativa.
> **Fase 2 — Movilidad 3D, logística y eliminación de fricción (2026-10-27):**
>   - **Tiro de servicio y Cabrias de contrapeso (`Winch.ts`):** Instalación procedural con cable y jaula vertical; velocidad de 8 m/s, descenso despejado ≥ 12 m. Reduce más del 30 % el tiempo de retorno vertical sin anular el valor de las escaleras.
>   - **Tolva de campaña (`FieldDepot.ts`):** Hasta 2 estaciones de acopio intermedio por turno, capacidad fija al 30 % de la mochila del jugador. Invariante estricta: almacena y permite retirar carga, pero jamás acredita cuota ni capital por sí misma.
>   - **Balizas de ruta (`Beacons.ts`):** Hasta 8 balizas direccionales procedimentales (`Q`), con ciclado de 5 colores y sincronización de red.
>   - **Plano topográfico de galerías (`GalleryMap.ts`):** Mini-mapa 2D a demanda (`C`), con perímetro del pozo, carves explorados, jugador orientado, tolva principal, cabrias, depósitos y balizas, y cota de profundidad.
>   - **Riesgo de carga crítica y derrame:** Carga >80 % penaliza velocidad de carrera y escalada en un 10 %. Caídas de ≥6 m con carga crítica provocan un derrame físico del 5–10 % de minerales en pepitas dispersas recuperables, con cero daño a la salud.
>   - **Arquitectura de red y guardado:** Sube a **Protocolo v12** (`PEER_ID_PREFIX = 'carbon-magnate-v12-'`) con validadores modulares (`ProtocolValidators.ts`), y **Guardado v6** (`carbon-magnate.save.v6`) con migración retrocompatible completa desde v5/v4/v3/v2.
>   - **Tests unitarios:** 52 tests en Vitest cubriendo cabrias, tolvas de campaña, derrame, guardado v6 y protocolo v12.
> **Fase 1 — Core Loop 3D y tensión de cuota (2026-10-27):** Verdad económica y regreso informado implementados (Anexo C de `PLAN_DE_ACTUACION_3D.md`). Los 4 carbones tienen `moneyYield = 0` y `carbonYield` en `8 / 14 / 20 / 30` (ningún carbón supera a un mineral en $/HP; la ley decrece con la profundidad). Liquidación autoritativa ampliada con prima de puntualidad (hasta 12 % de minerales en el primer 25 % del turno) y canje de excedente de carbón (0,20 $/t topado al 20 % de minerales) en el **Acta de Extracción**. Creado `ReturnPlanner` con heurística local a 2 Hz (distancia, desnivel y escaleras), reloj de retorno verde/ámbar/rojo en el HUD y cinta de rumbo horizontal/vertical a la tolva. Panel de apuntado muestra la ley del carbón y valor $/HP de minerales. HUD semántico que separa Cuota de carbono, Carga no asegurada y Capital de reposición. Aviso sonoro de cuota (`playQuotaWarning`) a 30 s, 15 s y 5 s; `playVictory` en victoria. Extraído `DaySummaryView` en UI. Suite unitaria completa con Vitest (32 tests en verde) y validación en CI.
> **Ejecutable actual:** `release/CarbonMagnate-2.0.0-portable.exe`.
> **Revisión de bucle (2026-10-25):** carga solo al depositar, tolva física, zona segura no minable, escaleras consumibles, jetpack late-game y empleados individuales.
> **Revisión visual del exterior (2026-10-25):** heightfield FBM, cielo por shader y borde superior del terreno aplanado. El protocolo sube a v6 para invalidar clientes con la generación anterior; guardado v4 sin cambios.
>
> **Ajuste de excavación (2026-10-25):** sin cuevas ni geodas naturales; el pico industrial abre cráteres más pequeños. El protocolo subió a v4 y después a v5 para invalidar clientes con generaciones anteriores.
> **Modularización (2026-10-25):** `Game.ts` baja de ~3.000 a ~620 líneas; el dominio se reparte en `DayCycle`, `Combat`, `Interaction`, `NetworkBridge`/`NetworkMessages`, `Hud`, `View`, `Session` y `Shop`/`ShopView`. Todos los TS quedan por debajo de 900 líneas, el CSS por debajo de 1.200 y `index.html` por debajo de 600.
> **Revisión de contenido (2026-10-25):** cubo macizo de 48 × 48 × 120 m sin túnel central, muchos más minerales y pepitas ligeras, capacidad de mochila ampliable, escaleras con fantasma/Anclaje/puentes y protocolo v5; guardado v4 con migración v3/v2.
> **Revisión de game feel (2026-10-25):** viewmodel de pico low-poly fusionado y renderizado en un pass iluminado propio, animación por fases con golpe diferido al frame de impacto, fragmentos direccionales, chispas metálicas, luz de impacto de 80 ms, micro-shake de cámara y pitch variable en el audio.
> **Revisión de cierre, tienda y vetas (2026-10-26):** liquidación de fin de día con desglose por mineral y **bonus por rendimiento** (`DaySettlement`, `dayBonusFor`), pantalla de cierre previa a la oficina y tienda reorganizada en pestañas Empleados/Equipo/Mejoras/Inventario con barra de caja, próxima cuota, día/modo y guardado. Las vetas ahora se apuntan con un `Raycaster` contra su geometría instanciada real (con proxies solo para broad-phase/asistencia) y una tolerancia de oclusión de 0,15 m; se elimina tanto el falso negativo de astillas visibles como el falso positivo de vetas invisibles tras un muro. Protocolo v9 (`deposit.lines`, `day_result.report`, `dayReport` en snapshot); guardado v5 sin cambios.
>
> **Revisión de inventario y densidad (2026-10-25):** ~8.300 vetas (≈7×) con 7–10 fragmentos físicos por nodo, pesos de 0,12–0,24 kg, inventario local de **9 slots de hotbar + 27 de almacenamiento**, herramientas/objetos movibles, granadas consumibles por tier, audio de pico en cuatro capas y pops de recogida. El protocolo sube a v8 por la retirada del lanzagranadas y el nuevo `grenade_use`; guardado v5 (migra v4/v3/v2).
>
> **Revisión de logística y economía (2026-10-26):** el recolector ya no pica ni succiona pepitas a distancia; vuela hasta cada una, carga hasta **20 kg (media mochila inicial)** y regresa volando a la tolva para depositar. El carbón aporta cuota **y** dinero, y se retiran del loot la arcilla y los escombros de roca. La generación baja a ~7.800 vetas, así que el protocolo sube a v10; guardado v5 sin cambios.
>
> **Publicación web y cartelería (2026-10-26):** workflow de GitHub Pages (`.github/workflows/deploy-pages.yml`) que compila y publica `dist/` desde `main`; `base: './'` sirve tanto en el subdirectorio de Pages como en Electron, y se publica `.nojekyll`. Los carteles de superficie, tolva y oficina pasan a tipografía dominante, menos líneas y mipmaps con anisotropía. El render exterior sube de un objetivo de 620 px a 900 px internos (ratio máximo 0,75) para ganar definición sin perder el pixelado.
>
> **Corrección de escaleras y protocolo v11 (2026-10-26):** clic izquierdo coloca y clic derecho abre un dial central que se elige con el ratón entre `vertical`, `diagonal-up`, `horizontal` y `diagonal-down` (clic izquierdo confirma; clic derecho o `Esc` cancela); `E` vuelve a ser solo depósito. Las diagonales son rampas transitables, se enlazan con prioridad a una escalera cercana y exigen un extremo apoyado: no se pueden colocar flotando ni atravesando roca o la plataforma. Se puede trepar por ambas caras, colocar puentes a cualquier altura de una vertical, apilar/continuar desde la cima y prolongar/girar/levantar verticales desde el extremo de un puente. `W` sube y hace manto; `Space` suelta y salta desde cualquier altura. El protocolo sube a v11 por las nuevas orientaciones; guardado v5 sin cambios.
>
> **Corrección de física, plantilla y loot (2026-10-26):** el jugador ya no se hunde en el terreno (`snapToTerrainSurface`) y sube el escalón de la plataforma caminando (`STEP_HEIGHT`); los mineros nacen en la superficie, comprueban cápsula y se ajustan al suelo; los recolectores se enrutan por la boca del pozo para no atravesar la plataforma, y vuelven a la tolva al llenarse o cuando no quedan pepitas que quepan. Los avatares de plantilla se ocultan si su cuerpo entra en roca. Las pepitas usan la misma receta visual que la veta: material estándar con color base y emisivo por instancia y halo `Points` con `mineral.glow`; sin `vertexColors` de geometría.

## 1. Resumen

Carbon Magnate es un juego de minería 3D en primera persona para navegador y Windows. El jugador desciende a un pozo corporativo, excava terreno orgánico, fractura vetas, recoge mineral y debe **volver a la superficie para depositar la carga** en una tolva antes de que termine el turno. La cuota creciente y la tienda nocturna empujan a reinvertir en herramientas, escaleras, jetpack y plantilla. El modo cooperativo conecta 1–4 jugadores por WebRTC con un código de sala de 6 caracteres.

La dirección artística separa dos espacios:

- **Exterior, menús, oficina y cartelería:** pixel art natural. Render de baja resolución con escalado nearest-neighbor, cuantización por filtro SVG, texturas de canvas pixeladas, cielo atmosférico con nubes de shader, montañas/bosque de heightfield FBM, ciclo día-noche (mañana → noche) y un logo bitmap generado por código.
- **Interior del pozo:** 3D orgánico low-poly con Marching Cubes, flat shading y colores por triángulo/cara de roca.

El nombre **Carbon Magnate** sustituye por completo al nombre de trabajo anterior. No deben quedar referencias a Carbon Core ni a Steamworks.

## 2. Objetivos de diseño

- Excavación libre que se sienta física: cráteres, túneles y pendientes, no una rejilla de cubos. El subsuelo es macizo y el jugador abre cada hueco.
- Un bucle corto y frenético: turnos de 90 s, presión de cuota y reinversión inmediata.
- Riesgo/recompensa de superficie: la carga no cuenta hasta llegar a la tolva. Al principio hay que volver a pie usando escaleras; el jetpack se desbloquea más tarde.
- Progresión roguelite ligera dentro de una partida: armas, mejoras, pasivas de cofres y plantilla.
- Cooperativo sin servidores dedicados ni configuración de puertos.
- Cero activos externos: geometría, texturas, UI, logo y audio generados en tiempo de ejecución.
- Determinismo estricto del mundo compartido.
- Rendimiento interactivo: simulación física a 60 Hz fija, colisiones de terreno O(1), loot y nodos instanciados.

## 3. Plan original y estado

El encargo original se dividió en siete pasos. Todos están implementados, más una revisión posterior del bucle de superficie:

1. **Setup:** Vite + TypeScript + Three.js + PeerJS + Electron; scripts `dev`, `build:web`, `electron:dev`, `build:win`. ✅
2. **Terreno determinista:** PRNG, campo de densidad, Marching Cubes por chunks, excavación, historial e colisiones O(1). ✅
3. **Vetas, cofres y loot:** nodos instanciados, IDs estables, drops con `dropSeed`, física, imán y sonido procedural. ✅
4. **Arsenal y jetpack:** pico, pico eléctrico, taladro, escopeta con shotgun jump, granadas consumibles por tier y jetpack. ✅
5. **Online:** lobby por PeerJS, host autoritativo, semilla diaria, carves, nodos, economía, avatares interpolados y FX. ✅
6. **Ciclo diario, empleados, HUD y tienda:** reloj, cuotas, mineros/recolectores host-side, tienda nocturna y guardado. ✅
7. **Validación y entrega:** typecheck, builds, pruebas manuales de cooperación y `.exe` portable. ✅
8. **Revisión de bucle de superficie:** zona segura no minable, tolva con llenado visual, carga personal, escaleras baratas, jetpack como desbloqueo tardío y trabajadores individuales. ✅

## 4. Bucle jugable

### 4.1 Turno diario

- Duración base: **90 s**.
- Mejora de turno: **+15 s por nivel**, hasta 5 niveles → máximo 165 s.
- Al inicio del día el terreno, minerales y cofres se regeneran con una nueva semilla generada por el anfitrión.
- La recogida añade carbón y valor de mineral a la **mochila personal**. Nada cuenta para la cuota ni para el dinero hasta depositar en la tolva de la zona segura.
- La tolva es compartida; su montón crece con el carbono depositado y una fracción del valor de minerales del día, y se desborda visualmente al superar la cuota.
- Si el turno termina con carga en la mochila, se pierde.
- Al terminar el reloj:
  - Si `carbón >= cuota`: oficina nocturna, compras y siguiente día.
  - Si `carbón < cuota`: game over y borrado del expediente local.
- Al alcanzar el día 15 se muestra la **victoria corporativa**. El anfitrión puede activar el **modo infinito**, que continúa en el día 16 con cuotas exponenciales.
- Las cuotas base son exactamente:

| Día | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Carbón | 40 | 90 | 170 | 320 | 580 | 950 | 1.600 | 2.600 | 3.900 | 5.000 | 7.200 | 10.600 | 16.500 | 25.800 | 40.000 |

En cooperativo la cuota se multiplica por `1 + 0,6 × (jugadores - 1)`, calculado al inicio de cada día. Una incorporación a mitad de día no modifica la cuota ya activa.

### 4.2 Capas del pozo

| Capa | Profundidad | Nombre | Dureza | Recursos principales |
| --- | --- | --- | --- | --- |
| 1 | 0–25 m | Arcilla ocre | ×1,0 | Carbón común, cobre |
| 2 | 25–55 m | Pizarra gris | ×1,7 | Carbón denso, hierro, amatista |
| 3 | 55–85 m | Basalto magmático | ×2,8 | Carbón presurizado, oro, rubí |
| 4 | 85–120 m | Abismo cristalino | ×4,5 | Carbón puro, esmeralda, diamante rosa |

La dureza reduce radio y potencia de excavación. Los nodos de capas profundas tienen más HP.

### 4.3 Minerales y economía

El valor se reparte entre los fragmentos del nodo. Los fragmentos usan la misma receta visual que la veta (color base, emisivo y halo del mineral) y van al inventario local; el valor entra en la economía compartida únicamente al depositar en la tolva. Los recolectores IA del host recogen pepitas sueltas, cargan hasta 20 kg y las entregan al volver volando a la tolva; no pican ni depositan desde la distancia.

| Mineral | Carbón | Dinero | HP aprox. | Fragmentos | Peso/unidad | Capa |
| --- | --- | --- | --- | --- | --- | --- |
| Carbón común | 8 | $8 | 26 | 8 | 0,12 kg | 1 |
| Carbón denso | 24 | $24 | 54 | 8 | 0,14 kg | 2 |
| Carbón presurizado | 72 | $72 | 104 | 9 | 0,16 kg | 3 |
| Carbón puro | 300 | $300 | 178 | 10 | 0,20 kg | 4 |
| Cobre | — | $14 | 32 | 7 | 0,14 kg | 1 |
| Hierro | — | $32 | 60 | 8 | 0,16 kg | 2 |
| Amatista | — | $64 | 76 | 8 | 0,14 kg | 2 |
| Oro | — | $135 | 112 | 9 | 0,18 kg | 3 |
| Rubí | — | $225 | 140 | 9 | 0,16 kg | 3 |
| Esmeralda | — | $360 | 174 | 10 | 0,20 kg | 4 |
| Diamante rosa | — | $1.000 | 250 | 10 | 0,24 kg | 4 |

Los valores reales por nodo y tamaño se calculan en `src/config.ts`; las cifras anteriores son la referencia de balance.

### 4.4 Arsenal

| Arma | Rol | Desbloqueo |
| --- | --- | --- |
| Pico industrial | Melee, cráter pequeño, daño directo | Inicial |
| Pico eléctrico | Cadena a nodos del mismo racimo | $380 |
| Taladro de plasma | Túnel continuo manteniendo clic | $820 |
| Escopeta minera | Cono de perdigones y shotgun jump | $1.250 |

Las **granadas** ya no ocupan un slot de arma: son consumibles de cuatro tiers que se compran en la tienda, aparecen en el inventario y se lanzan desde la hotbar. Todas comparten el mismo radio de explosión (`GRENADE_AREA_RADIUS = 3,4`) y área de daño (`GRENADE_BLAST_RADIUS = 5,6`), pero cambian potencia (`carveStrength`) y capa máxima:

| Granada | Precio | Pack | Capa máx. | Potencia |
| --- | --- | --- | --- | --- |
| Fragmentación | $120 | 3 | 1 (0–25 m) | 0,75 |
| Demolición | $420 | 2 | 2 (25–55 m) | 1,15 |
| Penetración | $980 | 2 | 3 (55–85 m) | 1,55 |
| Sísmica | $2.200 | 1 | 4 (85–120 m) | 2,10 |

Una granada de tier insuficiente produce la explosión y el shake, pero no carvea ni daña nodos en esa capa; muestra un aviso de potencia insuficiente. El stock vive en `loadout.grenades` y se sincroniza con `grenade_use` + `economy`.

El daño escala con mejoras globales y pasivas de cofre. La cadencia escala con la mejora de velocidad. El pico industrial usa un alcance de 5,0 m y un radio de excavación de 0,15 para abrir cráteres compactos; el taladro y los explosivos conservan sus radios mayores. El pico resuelve su raycast al 35 % del swing (el frame visual del impacto), y sincroniza con ese instante partículas, luz breve, audio y micro-shake.

### 4.5 Progresión

- **Armas:** desbloqueo permanente durante el expediente.
- **Mejoras:** daño, cadencia, imán, duración del turno, **capacidad de mochila** y **jetpack**. El nivel 0 bloquea el jetpack; el primer nivel lo desbloquea (100 de combustible) y los siguientes amplían el depósito. La capacidad base es 40 kg y cada nivel añade 20 kg.
- **Cofres:** una pasiva aleatoria determinista por cofre. Afectan a todo el escuadrón y son permanentes: radio de excavación, daño a nodos, imán, velocidad de empleados y combustible.
- **Suministros:** escaleras baratas ($30 por 4); el expediente empieza con 8. El stock es de equipo y persiste entre días; las escaleras colocadas se borran al amanecer.
- **Empleados:** hasta 6 trabajadores individuales. Todo contrato nuevo empieza como **minero becario**. Cada registro puede ascender (Becario → Asociado → Senior → VP) o reconvertirse en recolector por $150 conservando el rango. El minero excava y fractura vetas; se ajusta al suelo y comprueba cápsula para no incrustarse en la roca. El recolector solo vuela a por pepitas sueltas, carga hasta 20 kg, usa la boca del pozo para entrar y salir de la plataforma y deposita en la tolva.
- **Pasivas de cofre:** se aplican de inmediato al jugador; la plantilla recoge los nuevos multiplicadores al configurarse el siguiente día.
- **Guardado:** conserva día, dinero, armas, mejoras (incluida capacidad), pasivas, roster, rangos, stock de escaleras, estadísticas, modo infinito y nombre.

## 4.6 Bucle de superficie, carga y escaleras

### Zona segura y spawn

- El terreno minable termina en `x,z = ±24` (48 × 48 m; 4× el área anterior).
- Alrededor existe una plataforma segura (hasta `±30,5`) a `SURFACE_DECK_Y = 0,01`: no hay campo de densidad allí, por lo que no se puede excavar, colocar explosivos ni encontrar vetas.
- El spawn está en `SURFACE_SPAWN = (0, 29)` sobre el pad metálico sur, con la tolva a la derecha.
- La zona segura contiene spawn pad, carteles, señalización de suelo hacia la tolva y la **tolva** en `(14, 28.5)`. El límite se justifica con montañas, bosque y rocas naturales; no hay skyline urbano ni vallas metálicas.
- El pozo ya no tiene túnel central: es un cubo macizo. El jugador camina sobre la plataforma segura, pisa la superficie del cubo y debe excavar para descender. El escalón entre el terreno minable y la plataforma es de unos centímetros y se sube caminando; para volver desde el fondo siguen haciendo falta escaleras o el jetpack.

### Tolva

- `Hopper.update(dt, carbonDepositado + dailyMoney * 0,025, quota)`.
- La carga visual se suaviza con `damp`; el pico del montón, la luz y los chunks de mineral crecen con el progreso.
- Al depositar se dispara una pulsación visual y sonora.
- La interacción se ofrece a ≤3,5 m en horizontal y cerca del nivel de cubierta.
- `dayMoneyBase` se fija al inicio del día para que solo el dinero depositado ese día contribuya al volumen visual; se envía dentro de `DaySnapshot`.

### Carga y depósito

- `cargoCoal`, `cargoMoney` y `cargoWeight` son agregados **locales** que se derivan del inventario; no se envían hasta el depósito.
- Recoger fragmentos los apila en `Inventory` (9 slots de hotbar + 27 de almacenamiento, minerales a 64). La cuota, el dinero del equipo y la mochila se muestran por separado en el HUD; las herramientas, escaleras y granadas viven como objetos movibles.
- `depositCargo()` exige estar junto a la tolva y pulsar `E`; vacía **solo los minerales** (herramientas, escaleras y granadas permanecen), reproduce un barrido de vaciado y envía `deposit` al host si es cliente. Si el envío falla, conserva la carga.
- En solo/host, `applyTeamDeposit()` suma a cuota/dinero/estadísticas y emite `economy` en red.
- Al acabar el día se llama a `discardCargo()`: la carga mineral que no llegó a la tolva se pierde; herramientas, escaleras y granadas permanecen en el inventario.

### Escaleras

- Compra: `supply:ladders`, $30 por 4; stock inicial 8.
- Colocación: `G` activa/oculta el **modelo fantasma** (arranca oculto para no llenar la vista); **clic izquierdo** coloca y **clic derecho** abre un **dial central** con `vertical`, `diagonal-up` (rampa ascendente), `horizontal` (puente) y `diagonal-down` (rampa descendente). El dial se maneja con el ratón: el movimiento resalta la opción, el clic izquierdo confirma y otro clic derecho o `Esc` cancela. `R` sigue ciclando como alternativa de teclado. Verde si es válida, rojo si no. `E` solo deposita. El alcance es 5,5 m y el tramo mide 4,4 m.
- Anclaje obligatorio: pared, suelo u otra escalera. Si se apunta a la cima de una escalera vertical, el nuevo tramo se apoya encima; si se apunta al extremo de un puente, se prolonga. Un puente horizontal también puede anclarse a la cima de una vertical apuntando a ella o simplemente estando de pie encima (`findNearestTop`). Al coronar una vertical se permanece en el **filo** de la escalera, sin plataforma añadida; desde ahí se puede apilar otra vertical o sacar puentes a los lados (`findNearestTop`). Desde el extremo de un puente se puede prolongar, girar o levantar una vertical (`findNearestEnd`); también se puede anclar un puente a cualquier altura apuntada de una vertical (`findVerticalPoint`/`findNearest`). Las escaleras verticales se trepan por **ambas caras** (el lado se fija al engancharse). Las diagonales son rampas transitables de 45°: si hay una escalera cerca, toman prioridad y enlazan su extremo con la cima, el tramo o la punta de esa escalera (`findDiagonalLink`); si no, apoyan el extremo inferior (ascendente) o superior (descendente) en el suelo bajo los pies. Se rechazan las rampas sin apoyo o cuyo trazado atraviesa roca o la plataforma segura, de modo que ningún tramo queda flotando. Se permiten cruces, esquinas y uniones en T entre puentes; solo se rechaza que dos tramos discurran casi en la misma línea y se pisen. El fantasma y la colocación se rechazan si el volumen atraviesa un mineral.
- Escalada: cerca de una escalera vertical, `W` sube por la cara desde la que te acercas, `S` baja y `A`/`D` suelta; `Space` suelta la escalera y salta desde cualquier altura. En la parte superior, `W` te mantiene en el filo, busca un borde aterrizable (`tryMantle`, sin bajar más de 0,35 m) o sube a un puente colocado encima. Los puentes horizontales son plataformas transitables de un solo sentido. Las escaleras apiladas se enlazan por la cima sin soltar al jugador.
- La colocación consume una unidad del stock compartido y se replica: el cliente aplica localmente y envía `ladder_place`; el host valida/descuenta, reemite `ladder_placed` y sincroniza el stock por `economy`.
- Las escaleras colocadas no se guardan en disco; se limpian al cargar el siguiente día. El stock sí se guarda.
- El jetpack no está disponible al inicio; es una compra de $3.000 en la tienda nocturna. La escalera es la herramienta de retorno inicial.

## 5. Excavación orgánica

### 5.1 Representación

- Dominio: `x,z ∈ [-24, 24]`, `y ∈ [-120, 0]` para el terreno útil.
- Cubo macizo: no hay túnel central, cuevas ni geodas naturales; todas las excavaciones abren huecos.
- Los límites laterales y el fondo tienen una capa de roca oscura visible (bedrock) y el jugador se detiene antes de atravesarla; así el límite no se percibe como una pared invisible.
- Muestreo de densidad: 1 m, 49 × 129 × 49 muestras (incluye margen aéreo superior).
- Chunks: 4 × 16 × 4, celdas de 12 × 8 × 12.
- La malla visible se construye por Marching Cubes y se reconstruye solo para chunks afectados por un carve.
- El material usa flat shading, color por triángulo, shader GLSL de ruido/pixelado y normales orientadas contra el gradiente.

### 5.2 Colisiones y raycast

- `Terrain.getDensityAt()` interpola trilinealmente; `> 0.5` es sólido.
- El jugador, el jetpack, el loot y la IA consultan densidad, no la malla.
- El apuntado y los disparos usan raycast de densidad por marcha + refinado binario. Para las vetas, el objetivo se decide lanzando un `Raycaster` contra la geometría instanciada real (`InstancedMesh.getMatrixAt`), no contra una esfera aproximada. La oclusión compara la distancia al triángulo con el primer sólido del terreno (tolerancia 0,15 m para la diferencia de Marching Cubes). Si el rayo central no toca nada, un cono de asistencia de 2,6° prueba la geometría real de hasta 12 proxies cercanos y también descarta lo que esté tras un muro. Así una veta invisible no se convierte en objetivo y una astilla visible sí se puede picar.
- La excavación modifica la densidad con caída suave y marca chunks sucios.

### 5.3 Determinismo de recursos

- La semilla diaria se elige solo en el host y se distribuye con `start_day`/`sync`.
- `Resources.generate(seed, day, terrain)` coloca nodos y cofres usando la densidad base y un PRNG determinista. La semilla se mezcla con el día, y los centros de racimo se sortean en todo el cubo, así que el yacimiento cambia de sitio cada jornada.
- El cubo es macizo: los nodos quedan embebidos en roca y se descubren al excavar. Hay ~7.800 nodos y 16 cofres; la rotura suelta 7–10 fragmentos y cada golpe añade 1–2 chips.
- El orden en `DayCycle.loadSnapshot()` es crítico: terreno base → recursos → historial de excavación → nodos rotos/hp. Alterarlo desincroniza los IDs y la posición de minerales en incorporaciones tardías.
- El `dropSeed` de cada rotura es función de la semilla del día, del `nodeId` y de un hash estable.
- Cada fragmento tiene un peso propio (`MINERALS[].weight`); la mochila se llena por peso y por slots, no por número de pepitas.
- Los golpes a un nodo sueltan 1–2 piezas extra; su carbón/dinero se descuenta del lote de rotura local para conservar el yield. Picar terreno normal no suelta loot: la roca y la arcilla son residuo.

### 5.4 Loot

- Capacidad: 6.000 fragmentos instanciados.
- Física local con gravedad, colisión contra la densidad, rebote, deslizamiento y magnetismo a partir de 0,25 s.
- La red no sincroniza cada fragmento. Cada cliente genera su propia lluvia con el `dropSeed`; al recoger, lo apila en su inventario local; solo al depositar envía un mensaje agregado `deposit` al host.
- Incorporación tardía: no aparecen los fragmentos que ya existían. Es una decisión de diseño para evitar enviar posiciones de miles de objetos; los drops nuevos sí aparecen.

## 6. Cooperativo

### 6.1 Transporte

- `peerjs` 1.5.5 con DataChannel fiable.
- Cierre: el host calcula `DaySettlement.buildDayReport()` con el desglose de `deposit.lines`, `oreValue` y el bonus de `dayBonusFor()`. El bonus se acredita en el host y viaja en `day_result.report`; el cliente solo muestra la liquidación. La tienda se abre después de pulsar Continuar.
- El host reserva un Peer ID `carbon-magnate-v14-<código>` con código de 6 caracteres del alfabeto sin caracteres ambiguos. La v14 añade simulación de brigadas, sectores y cintas de retorno; la v12 añadió cabrias, tolvas de campaña y balizas; la v11 añadió las orientaciones `diagonal-up`/`diagonal-down` al estado de escalera; la v10 retiró la arcilla y los escombros de roca del loot, hizo que el carbón pagara dinero además de cuota y cambió la IA del recolector; la generación baja a ~7.800 vetas. La v9 añade la composición `deposit.lines` y `day_result.report` (desglose y bonus), y `dayReport` en el snapshot de late-join; la v8 cortó la compatibilidad por la retirada del lanzagranadas, el inventario de objetos, `loadout.grenades` y `grenade_use`; la v7 cambió densidad/colocación de vetas, la v6 el borde superior del terreno y la v5 el tamaño del mundo y las escaleras.
- Los clientes se conectan al host; topología estrella. No hay servidor dedicado ni migración de host.
- Señalización: PeerJS Cloud. STUN/TURN públicos configurados en `PeerNetwork.ts`.
- La UI de lobby permite copiar código; el enlace web solo se muestra cuando la app se sirve por HTTP/HTTPS, no en el esquema `carbon://` de Electron.

### 6.2 Autoridad

- **Host:** semilla, cuota, reloj, fin de día, personal IA, decisiones de tienda, recompensas de cofres, snapshots.
- **Clientes:** predicción local inmediata de excavación, daño visual, carga y colocación de escaleras; envían `carve`, `node_hit`, `node_break`, `deposit`, `ladder_place`, `fx` y `purchase`.
- **Host:** retransmite eventos, mantiene historial de carves, agrega estados, aplica compras y publica economía.
- Los clientes no guardan expediente ni terminan el día.

### 6.3 Sincronización

- Estados de jugador: 20 Hz; clientes al host, host agrega y reemite, clientes interpolan.
- Personal: 5 Hz desde el host.
- Economía/reloj: 4 Hz desde el host.
- Carves: evento ligero `{x,y,z,r,s}`; historial máximo 4.000 por día.
- Nodos: `node_hit` con daño e identidad; `node_break` con `dropSeed`; el host conserva la lista de rotos y hp para late join.
- Cofres: recompensa pasiva elegida de forma determinista y validada por el host; se retransmite el nuevo loadout.
- Tienda: el cliente envía `purchase`; el host valida, descuenta, actualiza y difunde `shop_state`. La interfaz se organiza en pestañas Empleados/Equipo/Mejoras/Inventario; incluye armas, mejoras, escaleras, granadas y cambios de plantilla.
- Tolva: `deposit` del cliente → host aplica cuota/dinero/estadísticas → `economy` para todos. La mochila no se replica.
- Escaleras: `ladder_place` → host valida stock, añade y emite `ladder_placed` + `economy`; el snapshot de late join incluye la lista y el stock.
- Snapshot máximo: 512 KiB por mensaje. Las escaleras viajan con `orientation` (`vertical`/`horizontal`) y `anchorId`.

### 6.4 Ciclo de conexión

1. Host crea sala; recibe código.
2. Cliente introduce el código; handshake `hello`/`welcome`, roster compartido.
3. Host inicia turno: construye `DaySnapshot` y emite `start_day`.
4. Si un cliente entra a mitad de día: `sync` con historial, nodos rotos/hp, jugadores, staff, escaleras, stock, granadas, `dayMoneyBase`, `dayReport` y economía.
5. Al final del día el host emite `day_result` con `report`; en éxito ambos muestran la liquidación y después abren la tienda; en fracaso `game_over`.
6. Compras del cliente se validan en host y se sincronizan.
7. El host inicia el siguiente día con nueva semilla.
8. Si el host se desconecta, la sesión termina; no hay reconexión automática.

## 7. Persistencia

- Claves:
  - `carbon-magnate.save.v5`
  - `carbon-magnate.name`
  - Migración de lectura: `carbon-magnate.save.v4`, `carbon-magnate.save.v3` y `carbon-magnate.save.v2`.
- Se guarda: día, dinero, modo infinito, loadout (armas, mejoras, pasivas, roster, escaleras y granadas), estadísticas y nombre. La disposición de la hotbar y los minerales de la mochila no se guardan.
- Se guarda:
  - Al iniciar cada día.
  - Cada 12 s de simulación.
  - Al cambiar de visibilidad/cerrar la pestaña.
  - Al comprar.
  - Al finalizar un día con éxito (se guarda el día siguiente).
- Se borra al fracasar la cuota.
- Los clientes online no escriben el expediente de partida; solo puede persistirse su nombre de operario como preferencia.
- Cambios futuros de esquema requieren una nueva clave/versión o migración explícita; no reutilizar `v5` con otra estructura. Las claves v4, v3 y v2 se leen como migración.

## 8. Arte, audio y UI

- **Exterior pixel art:** `View.updatePixelMode()` decide la resolución interna; aplica `is-pixelated`, filtra con el SVG `#pixel-quantize` y usa texturas nearest-neighbor. `SkyCycle` interpola cielo atmosférico, nubes, niebla, ambiente y luz solar desde la mañana (progreso 0) hasta la noche (progreso 1); `Landscape` genera un heightfield FBM con montañas, bosque, rocas y vegetación. Al bajar al pozo se recupera resolución completa.
- **Logo:** `src/ui/PixelLogo.ts` dibuja un bitmap 5×7 en canvas. No añadir una fuente externa.
- **Cartelería:** `Environment.ts` y `Hopper.ts` generan canvas con texto corporativo. El exterior se renderiza con un objetivo de 900 px internos (tope de ratio 0,75): los carteles usan un titular que ocupa casi todo el panel, pocas líneas auxiliares y filtrado mipmapped con anisotropía; la letra pequeña se lee antes que con el render anterior, pero sigue habiendo un límite a gran distancia. Además, apuntar a un cartel activa el `aim-panel` en modo lectura (`Environment.raycastSign()`): el título y el subtítulo se pintan en DOM nítido, con la distancia, y siguen siendo legibles a 54 m aunque el cartel 3D sea un bloque de píxeles. El cielo atmosférico con nubes procedurales y el entorno montañoso viven en `SkyCycle.ts` y `Landscape.ts`.
- **Viewmodel:** el pico se dibuja en una escena y un pass propios, con luces locales y `MeshStandardMaterial` + `flatShading`; las geometrías se fusionan por material para reducir draw calls. La linterna no lo ilumina, así que no se quema. Las demás armas conservan materiales sin iluminación. El cabezal va girado 90° para que las puntas apunten en profundidad, con una punta delantera larga y un pivote en la muñeca; anima por fases con anticipación, golpe, rebote elástico y recuperación en `src/player/PickaxeModel.ts`.
- **Audio:** Web Audio 100 % sintetizado. El golpe del pico mezcla crujido de roca saturado, clink metálico, sub thud y pitch aleatorio ±12 %; las recogidas encadenan pops de 600–1400 Hz y el depósito añade un barrido de vaciado. El ambiente y los bucles de jetpack/taladro se reutilizan; el audio se inicializa tras un gesto del usuario. Los sonidos del equipo usan panner 3D.
- **UI:** HTML/CSS acoplados por IDs a `UI.ts`. No eliminar/renombrar un ID sin actualizar el código. La interfaz y todos los textos del juego están en español.
- **HUD de carga:** hotbar de **9 slots** siempre visible, panel de inventario **9×4 (36)** con `Tab`/`I`, iconos procedurales de minerales/herramientas/escaleras/granadas, contador `xN`, tooltips de peso/valor, peso/capacidad, tolva, prompt contextual `E`/`R`, estado bloqueado del jetpack y aviso de pérdida al cierre. La hotbar y el panel permiten arrastrar y soltar objetos.
- **Tienda:** cuatro pestañas (Empleados, Equipo, Mejoras, Inventario). Equipo agrupa armas, escaleras y granadas; Empleados permite contratar, ascender o reconvertir; Inventario muestra el equipo permanente. La barra superior muestra caja, próxima cuota y modo. Se conserva el scroll al recomprar.

## 9. Entrega y verificación

### Comandos

```bash
npm run dev
npm run typecheck
npm run build:web
npm run electron:dev
npm run electron:preview
npm run build:win
# GitHub Pages: push a main → workflow Publicar en GitHub Pages
# (Settings → Pages → Source: GitHub Actions)
```

### Comprobaciones ya realizadas

- `tsc --noEmit` en modo strict.
- Build de Vite y build portable de Electron.
- Arranque del ejecutable portable con protocolo `carbon://`, sin errores de consola en el menú ni en partida.
- Input real: pointer lock con clic, WASD, temporizador, ataque y pausa con Escape.
- Minería y recogida: excavación de terreno, rotura de nodos, loot y magnetismo; recoger no altera cuota/dinero.
- Densidad e inventario: ~7.800 nodos, rotura de 7–10 fragmentos más chips al golpear vetas, apilado 64, overflow de stack, hotbar 9 + 27, panel `Tab`/`I`, tooltip/contador, arrastre de herramientas y depósito que vacía los minerales (harness CDP temporal fuera del repo).
- Game feel del pico: viewmodel low-poly con cabezal girado 90° y pivote en la muñeca, fases de anticipación/golpe/rebote, partículas direccionales, luz de impacto de 80 ms, micro-shake, pitch variable y golpe diferido con cancelación al cambiar de arma (harness CDP temporal fuera del repo).
- Carga y tolva: depósito real en la zona segura, actualización de cuota/dinero, llenado visual y desbordamiento.
- Escaleras: colocación, consumo de stock, escalada, manto superior y réplica cliente→host. Prueba específica de escalada por ambas caras, `Space` para soltarse, puente a media altura apuntada de una vertical, colocación con clic izquierdo, dial central de cuatro orientaciones manejado con el ratón, enlace de rampas a escaleras cercanas y rechazo de rampas flotantes o enterradas (harness CDP).
- Jetpack: bloqueado de inicio; compra de desbloqueo, combustible y propulsión.
- Herramientas y explosivos: pico, taladro, escopeta, cadena eléctrica y granadas de los cuatro tiers (área común, capa máxima y potencia distintas).
- Empleados: contratación de mineros, ascenso individual, reconversión a recolector, estados de staff y visualización.
- Cooperativo real a dos ventanas: habitaciones, incorporación tardía, historial de carve, rotura de nodo, depósito compartido, escalera replicada, compra de plantilla, siguiente día y desconexión.
- Cierre y tienda: desglose por mineral, bonus por cuota/excedente, Continuar a la oficina, pestañas y compra; victoria de día 15, modo infinito y game over.
- Nodos: puntería con geometría real sobre astillas visibles, rechazo de vetas ocultas tras muro, asistencia de 1,4° y prueba de veta parcialmente enterrada (harness CDP temporal fuera del repo).
- Guardado/continuación de expediente.
- Carteles: lectura a 54 m con el panel de apuntado y pixel mode activo, y comprobación del raycast de `DESCENSO`, `OFICINA`, `ZONA SEGURA` y `TOLVA` (harness CDP temporal fuera del repo).
- Física de borde: caminar de la zona minable a la plataforma segura sin saltar ni hundirse, y de vuelta; altura del jugador ≈0,01 m dentro del pozo y 0,05 m en la plataforma (harness CDP).
- Plantilla: minero nace sobre el suelo y excava sin quedar dentro de sólido; recolector con 19,99 kg vuelve y deposita (carbón/dinero acreditados), y no baja de la plataforma fuera de la boca del pozo (harness CDP).
- Loot: pepitas con `instanceColor` del mineral; captura de cavidad con fragmentos de varios colores (harness CDP).

No hay tests automatizados. El workflow de GitHub Pages ejecuta `npm ci` + `npm run build:web` (typecheck incluido) en cada push a `main`, pero no hay runner de tests ni smoke E2E. Las verificaciones anteriores se hicieron con harnesses temporales de Electron/CDP fuera del repositorio. El workflow intenta habilitar Pages con origen **GitHub Actions** (`configure-pages` con `enablement: true`); si la organización lo bloquea, hay que activarlo a mano en **Settings → Pages → Source: GitHub Actions**. El despliegue real no se pudo ejecutar desde este entorno local.

## 10. Limitaciones y deuda técnica conocidas

### Calidad y pruebas

- Sin test runner ni linter.
- Sin CI; no hay garantía automática de regresión.
- Pruebas de red hechas en una sola máquina; falta validación de NAT, latencia y pérdida de paquetes reales.

### Red

- Señalización y TURN públicos; redes corporativas restrictivas pueden fallar.
- Sin reconexión, heartbeat explícito ni migración de host.
- El host confía en gran parte de los eventos del cliente (`node_hit`, `deposit`, `ladder_place`, carves). No hay anti-cheat ni rate limiting; un cliente podría reportar un depósito inflado.
- El hp de nodos converge por eventos; una pérdida de paquetes puede requerir esperar al `node_break`.
- Un late join no recibe fragmentos ya existentes en el suelo.
- El historial de carves se limita a 4.000; un día extremadamente intenso podría reconstruir solo parcialmente el terreno para un late join.
- La cuota se fija al empezar el día; un jugador tardío no incrementa la cuota de ese día.

### Producto

- El .exe no está firmado (SmartScreen puede avisar).
- No hay controles táctiles; la UI es responsive pero el juego está pensado para teclado y ratón.
- Solo hay español.
- No hay servidor de cuentas, cloud saves ni telemetría.
- La tienda guarda el siguiente día al abandonar; si el jugador abandona durante la liquidación o la oficina, se pierde la posibilidad de seguir comprando en ese expediente.
  - El layout de la hotbar y los minerales no se guardan; solo persisten loadout, dinero y estadísticas. El `dayReport` es transitorio y se reconstruye en el host.
- No hay una ranura de guardado específicamente cooperativa ni transferencia de expediente entre máquinas. El anfitrión puede guardar su progreso local, pero no está diseñado como partida cooperativa persistente y los clientes no conservan expediente.
- La IA de empleados no usa navmesh. Los mineros comprueban cápsula y se ajustan al suelo, pero excavan en línea recta y pueden abrir túneles excesivos. Los recolectores ya no atraviesan la plataforma: se enrutan por la boca del pozo y se mantienen por encima del suelo exterior; **bajo tierra siguen volando en línea recta**, aunque su avatar se oculta en cuanto el cuerpo entra en roca (`StaffAvatars`). Si el turno termina antes de que un recolector alcance la tolva, su carga se pierde como la del jugador.
- Sin cuevas ni geodas naturales, la prospección es directa: el jugador debe excavar para descubrir vetas; no hay escáner ni pistas a distancia.
- La tolva no tiene colisión física: el jugador puede atravesar parte de su geometría. El manto de las escaleras usa una búsqueda heurística de apoyo, no un sistema de escalada con animación.
- La mochila tiene límite de peso (40 kg base, +20 kg por mejora de capacidad) y **9 slots de hotbar + 27 de almacenamiento**; al llenarse hay que volver a la tolva. El riesgo de perder carga sigue siendo el reloj. El inventario y su disposición no se guardan ni se transfieren al cambiar de cliente; el loadout de herramientas/escaleras/granadas sí persiste.
- El inventario es una capa de HUD: en solo, `Tab`/`I` libera el cursor y pausa el reloj para permitir hover; en online el reloj sigue y el jugador queda inmóvil. Al cerrar se recupera el pointer lock (o se hace clic en el canvas).
- Con ~7.800 nodos, el raycast de recursos y las consultas de staff recorren más entradas; se mantienen dentro del presupuesto medido, pero conviene perfilar en equipos modestos.
- El volumen de la tolva es una estimación visual (carbón + fracción del dinero del día), no un inventario físico exacto.
- El kit inicial de 8 escaleras permite el primer turno; el requisito de comprar más aparece al profundizar. El jetpack cuesta $3.000, pero no hay bloqueo por número de día.

### Rendimiento y build

- El bundle principal ronda 943 KiB (≈254 KiB gzip); no hay code splitting.
- La generación inicial del terreno es síncrona en el hilo principal.
- La reconstrucción de chunks está limitada por frame; en excavaciones masivas puede haber un pequeño retraso visual.
- La calidad de las sombras/iluminación se ha priorizado para un único entorno de desarrollo; falta perfilado en equipos modestos.
- El viewmodel añade un segundo pass y el impacto del pico una `PointLight` extra; conviene medir el coste en GPU integradas.
- El filtro SVG de cuantización se aplica solo en exterior, pero conviene medir su coste en GPU integradas.

### Contenido / dirección

- Una sola tipología de pozo; todos los días usan el mismo generador con distinta semilla.
- Sin eventos aleatorios, mutadores diarios, jefes ni progresión meta fuera de la partida actual.
- El exterior es un escenario 3D pixelado/postprocesado, no una ilustración pixel art bidimensional dibujada a mano.

## 11. Roadmap

### P0 — Fiabilidad antes de ampliar contenido

1. **Tests unitarios** con Vitest:
   - PRNG y ruido determinista.
   - Cuotas y escalado multijugador.
   - Carga local, depósito autoritativo y pérdida al cierre.
   - Stock de escaleras, colocación y snapshots de late join.
   - Plantilla individual: contratación de minero, ascenso y reconversión.
   - Precios, compras, rangos y topes.
   - Serialización/validación de Protocol y límites de snapshot.
   - Determinismo de `Resources.generate` (IDs/posición de nodos con misma semilla y con carves).
   - Extracción de Marching Cubes: sin NaN, winding correcto, triángulos finitos.
   - Criterio de aceptación: `npm test` y `npm test -- <archivo>` documentados.
2. **Smoke E2E** reproducible con Playwright o harness Electron/CDP versionado en el repo:
   - menú → partida → carve → recogida → volver con escaleras → depositar en tolva → fin de día → tienda → siguiente día;
   - dos clientes: host, join, late join, depósito, escalera, compra y desbloqueo de jetpack.
3. **CI** con `npm ci`, `npm run typecheck` y `npm run build:web` como mínimo. ✅ El workflow de GitHub Pages ya ejecuta estos pasos en cada push a `main`; falta separar un job de CI que no dependa del despliegue y añadir los tests del punto 1.

### P1 — Red y UX

4. Configurar TURN/signaling mediante variables de entorno. El despliegue web ya está documentado en `README.md` y automatizado para GitHub Pages.
5. Heartbeat, detección de cierre más rápida y reconexión; evaluar migración de host.
6. Completar la validación de depósitos (importe máximo, rate limiting) y de colocaciones de escalera contra la posición real del cliente.
7. Rate limiting y validación más estricta de eventos de cliente; hp de nodos autoritativo por completo.
8. Ajustes de rendimiento: generación de terreno en Web Worker, pooling de geometrías, reducir luces activas bajo tierra.
9. Code splitting de PeerJS/Three; vigilar el warning de tamaño de chunk.
10. Ajustes de usuario: sensibilidad, invertir Y, volumen, calidad visual.
11. Tutorial inicial mínimo y ayudas contextuales para el primer descenso, la primera escalera y el primer depósito.
12. Guardado v8 con estado de tienda, brigadas, cintas y opciones de accesibilidad, migrando v7/v6/v5/v4/v3/v2.
13. Pruebas de escalada más completas: IA de navegación en paredes, colocación encadenada, manto y recuperación.
14. Mejoras de transporte adicionales (velocidad de escalada, capacidad de pértiga) y compra de escaleras desde una terminal de superficie si se quiere reforzar el early game.

### P2 — Contenido

15. Mutadores diarios, contratos secundarios y eventos de mina.
16. Más ramas de pasivas y variantes de armas/modificadores.
17. Objetivos de profundidad con recompensas únicas y jefes/estructuras corporativas.
18. Interacción física con la oficina 3D en lugar de solo overlay.
19. Una pasada de arte pixel art 2D más autoral para el exterior (sin activos externos), y una tolva con colisión y animación de descarga.
20. Localización a otros idiomas y opciones de accesibilidad.

## 12. Reglas para continuar el proyecto

1. Leer `CLAUDE.md` y este documento antes de modificar arquitectura o red.
2. Ejecutar `npm run typecheck`; antes de cerrar, `npm run build:web` y, si se toca escritorio, `npm run build:win`.
3. Mantener los invariantes de determinismo, autoridad del host y no-envío-de-mallas.
4. No añadir activos externos ni dependencias de arte/audio. Todo se genera por código.
5. Mantener la UI de juego en español y el tono corporativo/industrial.
6. Cuando cambie el protocolo, subir `PROTOCOL_VERSION` y actualizar ambos lados, snapshots y documentación.
7. Cuando cambie el guardado, versionar la clave o implementar migración; nunca reinterpretar un esquema existente.
8. Actualizar este plan y `CLAUDE.md` si cambia la arquitectura, el estado de entrega, el balance principal o la deuda técnica.

## 13. Cómo retomar en una conversación futura

Checklist rápido:

- Leer `CLAUDE.md`, este `plan.md` y `README.md`.
- Revisar `git status` antes de tocar archivos.
- Confirmar que el nombre del producto es **Carbon Magnate** y que no aparezcan restos de Carbon Core.
- Ejecutar `npm run typecheck`.
- Arrancar con `npm run dev` o `npm run electron:dev`.
- Si se va a tocar red, leer juntos `PeerNetwork.ts`, `Protocol.ts`, `NetworkBridge.ts`, `NetworkMessages.ts` y `DayCycle.ts`. Probar con dos ventanas e incluir depósito y escaleras.
- Si se va a tocar mundo, revisar el orden de generación y el contrato de IDs/semilla.
- Si se va a tocar el bucle económico, verificar que recoger no acredita, que depositar sí, que la mochila no persiste y que el jetpack está bloqueado a nivel 0.
- Si se va a tocar la plantilla, recordar que cada empleado es un registro con id propio y que todo contrato nuevo nace minero.
- Si se añade una función nueva, actualizar primero esta hoja de ruta y luego implementar con su prueba o verificación correspondiente.

## 14. Decisiones que conviene conservar

- **Semilla compartida en lugar de mallas:** el estado del terreno converge por simulación determinista y eventos ligeros.
- **Loot local + depósito autoritativo:** se evita saturar la red y se preserva el bucle de volver a la tolva; el coste es que cada cliente tiene su propia mochila y el late join no ve drops antiguos, además de que el host confía en el importe reportado.
- **Inventario local por hotbar + slots:** 9 casillas rápidas y 27 de almacenamiento. El cliente sigue enviando un `deposit` agregado; el detalle de minerales no viaja por red ni se guarda. Herramientas, escaleras y granadas se derivan del loadout (que sí persiste) y pueden reordenarse localmente. El límite de peso y el llenado de slots se validan antes de absorber una pieza.
- **Densidad ×7 con yield repartido:** se multiplican los nodos y fragmentos para que casi cualquier túnel revele mineral, pero el carbón/dinero por nodo se divide para conservar el orden de magnitud de la economía y la presión de cuota.
- **Host autoritativo en estrella:** simple y funcional para 1–4 amigos; el precio es no tener host migration.
- **`Game` como orquestador central:** velocidad de desarrollo; si el proyecto crece, extraer servicios de día, red y tienda con tests antes de refactorizar.
- **Liquidación con bonus variable:** el valor de los minerales se abona en la tolva; el bonus de cierre usa una base que crece con el día (150 + 50/día) y se duplica como máximo al entregar el doble de la cuota. No se paga si se fracasa. Así el total depende del rendimiento sin romper la economía temprana.
- **Geometría real + broad-phase:** las esferas de la silueta solo filtran candidatos; el impacto se valida con `Raycaster` contra la matriz instanciada real y la oclusión de terreno. El cono de ayuda limita los candidatos a 12 y también valida geometría/oclusión. Es más preciso que un único radio y evita apuntar a vetas invisibles.
- **Tienda pura extraída:** `buildShopItems` y `applyPurchaseToRun` viven en `src/core/Shop.ts`; `ShopView.ts` conserva los efectos (audio, UI, guardado y red). Es el primer paso de la modularización incremental descrita en la skill `token-economy`.
- **Modularización aplicada:** `Game` conserva estado, bucle y composición; `DayCycle`, `Combat`, `Interaction`, `Inventory`, `InventoryView`, `MineralIcon`, `NetworkBridge`/`NetworkMessages`, `Hud`, `View`, `Session` y `Shop`/`ShopView` son módulos independientes. Las auditorías y las skills siguen las nuevas rutas.
- **Exterior pixel art por postproceso + texturas procedurales:** no requiere arte 2D externo y mantiene un único motor 3D; una futura iteración podría añadir ilustración pixel art real.
- **Guardado en localStorage:** suficiente para una partida local; no sustituye a cuentas/cloud.
- **Empleados individuales:** permiten ascensos/reconversiones específicas, a costa de más estado y UI; se fija un máximo de 6 para mantener la legibilidad.
- **Tolva visual con desborde:** se prioriza la lectura de progreso sobre la simulación exacta de cada mineral.
