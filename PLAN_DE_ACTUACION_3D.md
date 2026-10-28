# Plan de actuación 3D — Carbon Magnate

> **Nota (2026-10-28):** este documento describe el plan anterior. El rumbo vigente es la emulación de Coal LLC en 3D resumida en `plan.md` y `CLAUDE.md`: Fase 1 jugable con 12 biomas/20 niveles/240 m, 31 pasivas, cofres 1–12, 15 tiers de pico, modos/modificadores, guardado v9 y protocolo v15; Fase 2A con 22 familias de armas y 13 profesiones; Fase 2B con 7 topologías de pozo y encargos de galería (protocolo v17). **Siguen pendientes** los comportamientos únicos de proyectil/órbita, las brigadas masivas y la migración real a `BigValue`. No citar este documento como “100 % implementado”: varias casillas de la Fase 3 siguen sin marcar.
>
> **Estado histórico:** Implementado y verificado (Fases 1, 2, 3, 4 y 5 completadas; protocolo v14, guardado v8, suite de 17 tests con 115 pruebas en verde, 9 auditorías estáticas con 0 errores y 0 warnings).
> **Base ejecutada:** `carbon-magnate@2.0.0`, protocolo v14, guardado v8, 2026-10-28.
> **Documentos actualizados:** `CLAUDE.md`, `README.md`, `plan.md`, `GDD.md` y los nueve `SKILL.md` de `.claude/skills/`.
> **Validación estática y dinámica:** `npm run typecheck`, `npm test` (17 archivos, 115 tests), `npm run build:web` y `npm run build:win` superados. 9 auditorías estáticas ejecutadas con 0 errores y 0 warnings. Audio con 0 métodos huérfanos (conectados `playQuotaWarning` y `playVictory`). Contexto con 0 advertencias (todos los archivos TS $\le 900$, CSS $\le 1200$, HTML $\le 600$).
> **Regla de identidad:** este documento abstrae principios sistémicos. No copia nombres, cifras, tiers, clases, mapas, textos, interfaces ni lore del referente. Cuando una idea se inspira en un principio ajeno, se reformula con fantasía, nomenclatura y ejecución propias.

---

## 0. Resumen ejecutivo

Carbon Magnate ya tiene el esqueleto correcto: excavación 3D determinista, tolva física, reloj, tienda nocturna, escaleras, jetpack tardío, plantilla y cooperativo P2P. Lo que falta no es “más contenido”, sino **tensión sistémica**: decisiones que compitan entre sí dentro de la jornada y una progresión que se sienta exponencial sin romper la legibilidad ni el rendimiento.

### Las cinco conclusiones

1. **La doble divisa está invertida.** El carbón paga cuota **y** capital, y además es más eficiente por HP en las capas profundas. Hoy la estrategia dominante es “bajar y picar carbón”, no elegir entre sobrevivir e invertir. Es la brecha más importante y la primera que hay que corregir.
2. **El reloj existe, pero el jugador no puede planificar el regreso.** No hay estimación de retorno, rumbo a la tolva, mapa de galerías ni balizas. En 3D, la distancia euclídea miente: la tolva puede estar a 12 m y a 10 m de roca. El reloj mide el fracaso, no la decisión.
3. **La progresión es lineal y la cuota es casi exponencial.** Entre el día 1 y el 15 la cuota crece ×1.000, mientras el daño máximo comprable crece ×2,2 y la cadencia ×1,92. El hueco lo tapa el valor de las capas profundas, no una curva de poder diseñada. Además, el radio de excavación crece sin tope y el volumen escala al cubo.
4. **No hay asimetría de builds ni objetivos in-situ.** Solo hay una topología, un loadout acumulativo y cofres que dan pasivas. No existe una decisión que prohíba un sistema entero, ni una misión que obligue a desviarse y recompense con una utilidad que el dinero no compra.
5. **El escalado técnico aún no está preparado para el endgame.** 6.000 fragmentos con actualización O(N), 900 chispas, 220 escombros, hasta 12 luces de explosión, un `countSolids()` que recorre toda la rejilla en cada carve y personal que busca objetivos recorriendo todos los nodos. Antes de multiplicar entidades hay que introducir presupuestos, fusión de loot, LOD de simulación y carves por lotes.

### Scorecard de los siete motores

| # | Motor | Estado actual | Por qué | Fase propuesta |
|---|---|---|---|---|
| 1 | Economía de doble divisa en tensión | **Parcial, invertido** | El carbón paga cuota y capital; el rendimiento por HP crece con la profundidad | 1 |
| 2 | Bucle contrarreloj y entrega física | **Parcial** | Tolva y reloj funcionan; falta planificación espacial del regreso y riesgo de carga | 1–2 |
| 3 | Progresión por eliminación de fricción | **Parcial** | Hay escaleras, jetpack y recolectores; faltan rutas verticales expresas, depósitos y omisión de capas | 2 |
| 4 | Curva matemática de escalado | **Frágil** | Cuota ×1.000 frente a poder ×2–3; topes ocultos y radio cúbico sin conversión | 3 |
| 5 | Asimetría de builds y modificadores | **Ausente** | Un mapa, un loadout, sin doctrinas ni cláusulas | 3 |
| 6 | Misiones secundarias in-situ | **Ausente** | Solo cofres de pasivas; no hay objetivos físicos ni recompensas únicas | 3 |
| 7 | Feedback de progresión y narrativa ambiental | **Parcial** | Tolva y ciclo día/noche; la superficie no evoluciona y el HUD es numérico | 1 y 4 |

### Orden de ataque recomendado

1. **Fase 1 — verdad económica y regreso informado.** Separar cuota de capital, corregir la ley de profundidad, añadir reloj de retorno y rumbo a la tolva. Sin esto, las fases siguientes amplifican un bucle que no decide nada.
2. **Fase 2 — movilidad y logística 3D.** Convertir el viaje vertical en una ruta que se planifica y se mejora: cabria, tolva de campaña, mapa de galerías, balizas y, si la arquitectura lo permite, plataforma de servicios móvil.
3. **Fase 3 — escalado y asimetría.** Patentes, pasivas cuadráticas, conversión de excedentes, doctrinas, topologías, cláusulas y encargos de galería.
4. **Fase 4 — escala masiva.** Brigadas estadísticas, cintas de retorno, fusión de loot, presupuesto sensorial, números grandes y *game feel*.

---

## 1. Auditoría de brechas sistémicas

### 1.1 Método y evidencia

La auditoría combina tres lecturas:

- **Documentación:** `CLAUDE.md`, `README.md`, `plan.md`, `GDD.md` y las nueve skills.
- **Código:** configuración, economía, día, tolva, plantilla, loot, terreno, HUD, red y guardado.
- **Herramientas:** `npm run typecheck` y las nueve auditorías estáticas.

No hay tests automáticos ni runner en el repositorio. Las conclusiones de balance son **hipótesis de diseño** basadas en las tablas actuales, no resultados de playtest. Se marcan como `[H]` cuando son hipótesis y `[C]` cuando proceden directamente del código.

El bucle actual es:

```text
Menú → Día (90 s base) → excavar → inventario local con peso
     → volver a la tolva → E para depositar → liquidación → oficina → día + 1
```

El esqueleto es correcto. El problema es la **densidad de decisiones**: dentro de la jornada, el jugador optimiza “qué pica más rápido”, no “qué sacrifica hoy para crecer mañana”.

---

### 1.2 Motor 1 — Economía de doble divisa en tensión

#### Qué existe

- Hay dos contadores: `run.carbon` (cuota depositada) y `run.money` (capital). `RunSnapshot` los separa en `src/types.ts:155-164`.
- Los minerales tienen `carbonYield` y `moneyYield` en `src/config.ts:117-315`.
- El carbón actual paga **las dos cosas**: `coal.carbonYield = 8` y `coal.moneyYield = 8`; lo mismo ocurre con `coalDense` (24/24), `coalPressure` (72/72) y `coalPure` (300/300).
- `applyTeamDeposit()` suma ambos al mismo tiempo: `run.carbon += coal` y `run.money += money` (`src/core/Interaction.ts:119-142`).
- El HUD muestra `carbón / cuota` y `capital`, pero no explica la diferencia ni separa el valor de contrato del valor de venta (`src/core/Hud.ts:16-43`, `src/ui/UI.ts:517-579`).

#### El problema estructural

La ley de rendimiento decreciente por profundidad **no existe; está invertida**. Con los valores actuales:

| Capa | Mineral de carbón | HP | Carbón | Capital | Carbón/HP | Capital/HP |
|---|---|---:|---:|---:|---:|---:|
| 1 | Carbón Común | 26 | 8 | 8 | **0,308** | 0,308 |
| 2 | Carbón Denso | 54 | 24 | 24 | **0,444** | 0,444 |
| 3 | Carbón Presurizado | 104 | 72 | 72 | **0,692** | 0,692 |
| 4 | Carbón Puro | 178 | 300 | 300 | **1,685** | 1,685 |

El carbón profundo no solo es más rentable para la cuota: también supera al oro y al rubí por HP. El rubí, por ejemplo, rinde 225 $ / 140 HP = **1,607 $/HP**, ligeramente por debajo del carbón puro, y el oro rinde 1,205 $/HP. Solo la esmeralda (2,069) y el diamante (4,000) mantienen una ventaja clara. La consecuencia `[H]` es que el jugador racional baja, pica carbón y vuelve; la disyuntiva “cuota o inversión” se difumina porque el carbón resuelve ambas.

Además, no hay ninguna decisión de conversión: el excedente de carbón no se puede canjear, reservar ni sacrificar. O se deposita o se pierde al cerrar el día.

#### Qué falta

- Una **cuota de supervivencia** que no sea también la mejor fuente de capital.
- Una **ley de merma de estrato**: más profundidad debe implicar más HP por unidad de carbón útil, no más eficiencia.
- Una **vía de conversión del excedente** con coste de oportunidad (capital inmediato frente a reserva para el día siguiente).
- Una **lectura de “ley” en el HUD y en el apuntado**: el jugador debe ver que un carbón profundo es pobre para contrato antes de picarlo.
- Una **prima de puntualidad** o de eficiencia que premie asegurar la cuota pronto y volver a invertir.

#### Veredicto

**Parcial, invertido. Prioridad máxima.** Es la brecha que explica por qué el resto de sistemas no genera tensión: si el carbón lo paga todo, la optimización se reduce a tiempo por HP.

---

### 1.3 Motor 2 — Bucle contrarreloj y condición de entrega física

#### Qué existe

- Turno base de 90 s, +15 s por nivel de `dayTime`, máximo 5 niveles (`src/config.ts:35-36`, `:620-622`).
- La carga vive en un inventario local con peso y slots; recoger no acredita nada (`src/core/Interaction.ts:51-106`).
- La tolva está en la zona segura y exige `E` a ≤3,5 m (`src/core/Interaction.ts:108-117`, `:144-189`).
- Al cerrar el día, la carga no depositada se pierde (`discardCargo`, `src/core/Interaction.ts:191-198`).
- La HUD avisa a los 20 s y el objetivo contextual recuerda volver (`src/core/Hud.ts:197-231`).
- El depósito es físico y visual: la tolva crece y se desborda (`src/world/Hopper.ts`; `src/core/Interaction.ts:176-188`).

#### Lo que falta

El reloj funciona como **condición de fracaso**, pero no como **herramienta de planificación**:

- No hay estimación de tiempo de retorno. La distancia euclídea no sirve en un túnel 3D: la tolva puede estar cerca en XZ y lejos en Y, o al otro lado de una pared.
- No hay brújula, mapa, balizas ni rastro de migas. En un pozo macizo sin cuevas naturales, el jugador excava su propio laberinto y no tiene instrumentos para leerlo.
- No hay coste de transporte por peso: la mochila bloquea la recogida al llenarse, pero no ralentiza la subida ni afecta al riesgo.
- No hay depósito intermedio, seguro parcial ni decisión de “aseguro esto y sigo” más allá de volver entero.
- No hay recompensa por volver pronto; el único bonus depende de cubrir la cuota, no de la eficiencia del regreso.
- No hay riesgo de derrame o pérdida parcial de carga en una caída o un salto mal calculado.

#### Lectura 3D

En 2D, el viaje de vuelta es una línea; en 3D es una **ruta topológica**. La diferencia no es solo la distancia: es la orientación, la verticalidad, la luz y la memoria espacial. Sin instrumentos, el jugador no puede tomar la decisión “me voy ahora” con información; solo puede adivinar.

#### Veredicto

**Parcial.** La entrega física está muy bien resuelta; la tensión espacial del regreso, no. Prioridad alta para la Fase 1 y 2.

---

### 1.4 Motor 3 — Progresión por eliminación de fricción

#### Qué existe

- Escaleras colocables con orientación, anclaje, puentes y rampas (`src/world/Ladders.ts`, `src/core/Interaction.ts:200-676`).
- Jetpack desbloqueable y combustible (`src/player/Player.ts:19-35`; `maxJetpackFuel` en `src/config.ts:694-699`).
- Capacidad de mochila ampliable (`BASE_CARRY_WEIGHT`, `CARRY_WEIGHT_PER_LEVEL`, `maxCarryWeight`).
- Turno ampliable y mejoras de daño, cadencia, imán y capacidad (`UPGRADES`, `src/config.ts:481-530`).
- Recolectores que vuelan a por pepitas, cargan 20 kg y depositan en la tolva (`src/entities/Staff.ts:236-348`).
- Taladro de plasma y escopeta con *shotgun jump* (`WEAPONS`, `src/config.ts:318-395`).

#### Lo que falta

La progresión actual elimina fricción de **herramienta** (picas más rápido, taladras más rápido), pero apenas elimina fricción de **recorrido**:

- No hay una ruta vertical expresa para el jugador: la cabria, el montacargas o el tiro de servicio no existen.
- No hay depósito de campaña ni punto de acopio intermedio.
- No hay cinta, tubo o red de transporte que elimine el acarreo de fragmentos.
- No hay omisión de capas superadas: cada día se vuelve a bajar por el mismo tipo de pozo.
- La plantilla está limitada a 6 registros y no escala a brigadas; el recolector es una solución de nicho, no una red logística.
- No hay herramientas de orientación que reduzcan la fricción de “encontrar la salida” (mapa, brújula, balizas).

#### Lectura 3D

En un juego 2D, eliminar fricción suele significar “llegar más rápido al mismo eje”. En 3D, significa **cambiar la topología de la ruta**: abrir un acceso vertical, instalar un punto de acopio, mover la tolva o crear una red de retorno. Una mejora que solo sube la velocidad no cambia la decisión espacial; una cabria sí.

#### Veredicto

**Parcial. Prioridad media-alta.** Es el motor que más puede crecer sin añadir números, porque convierte el espacio en progresión.

---

### 1.5 Motor 4 — Curva matemática de escalado

#### Qué existe

- Cuotas diarias de 40 a 40.000 entre los días 1 y 15 (`src/config.ts:601-613`).
- Modo infinito con ×1,38 por día después del 15.
- Mejoras con crecimiento de coste ×1,55–1,7 y topes de nivel (`src/config.ts:481-530`).
- Pasivas de cofre lineales: +8 % radio, +10 % daño a nodos, +0,4 m imán, +12 % velocidad de empleados, +20 combustible (`src/config.ts:532-575`).
- Daño máximo comprable: `1 + 10 × 0,12 = 2,2×`.
- Cadencia máxima: `max(0,36, 1 - 8 × 0,06) = 0,52`, es decir, ~1,92× más rápido; el límite inferior de 0,36 no llega a activarse con el máximo actual de 8 niveles.
- Capacidad máxima: 40 + 6 × 20 = 160 kg, 4× la base.
- Los minerales profundos suben de valor: cobre 14 $, diamante 1.000 $; el carbón profundo 300.

#### El desajuste

La cuota crece ×1.000 en 15 días. El poder comprable crece como mucho ×2,2 de daño y ×1,92 de cadencia. El resto del crecimiento depende de:

- minar vetas más valiosas por HP (el diamante rinde 4 $/HP frente a 0,44 del cobre);
- empleados (máximo 6, con multiplicadores de rango 0,8–2,35);
- pasivas de cofre (lineales y sin techo claro).

Eso no es una curva diseñada; es una **compensación por contenido**. Funciona mientras el jugador llegue a la capa adecuada, pero no explica qué pasa en el día 20, ni cómo se evita que el jugador se estanque o se rompa la economía.

Además, hay tres problemas de escala:

1. **El radio de excavación es cúbico.** `carveRadiusMultiplier()` devuelve `1 + 0,08 × pasivas.digRadius`. Un +8 % de radio es +26 % de volumen; +60 % de radio es +310 % de volumen. Sin tope, una racha de cofres de `digRadius` puede multiplicar por 10 los escombros, los carves y el coste de malla. `[C]` en `src/config.ts:682-684`.
2. **El límite de cadencia es invisible.** `cooldownMultiplier()` tiene un suelo de 0,36. Hoy el máximo de mejora no lo alcanza, pero cualquier pasiva o nivel futuro que lo supere se pierde sin aviso. `[C]` en `src/config.ts:678-680`.
3. **No hay conversión de excedentes.** Si una estadística llega a su tope, el jugador sigue recibiendo mejoras de esa estadística y no obtiene nada. El referente lo resuelve parcialmente; aquí ni siquiera hay un aviso.

#### Qué falta

- Una curva de tres bandas: lineal al inicio, cuadrática en el medio, multiplicativa en el late.
- Patentes o tiers de herramienta que den saltos cualitativos, no solo +12 %.
- Pasivas con curva definida y topes visibles.
- Conversión de excedentes a otra estadística (daño, fractura, capacidad, auto-recogida) para que ninguna mejora se desperdicie.
- Una fórmula de volumen que limite el radio y convierta el exceso en daño, no en más roca destruida.
- Un backend de números grandes y un formato legible.

#### Veredicto

**Frágil. Prioridad alta para Fase 3.** El juego puede llegar al día 15, pero no tiene una respuesta de diseño para el día 25.

---

### 1.6 Motor 5 — Asimetría de builds y modificadores de partida

#### Qué existe

- Cuatro armas: pico, tesla, taladro y escopeta (`WEAPONS`, `src/config.ts:318-395`).
- Seis mejoras, cinco pasivas, cuatro tiers de granada, dos tipos de empleado y cuatro rangos.
- Una única topología de pozo: cubo macizo de 48 × 48 × 120 m (`PIT_SIZE`, `MINE_DEPTH`).
- Una única economía: mismos precios, misma cuota, mismos modificadores para todos.

#### Lo que falta

El loadout actual es **acumulativo**, no **exclusivo**. Comprar el taladro no impide comprar la escopeta; subir daño no impide subir cadencia; el jugador aspira a tener todo. Eso está bien para el early game, pero elimina la asimetría:

- No hay una decisión que **prohíba** un sistema entero (por ejemplo, renunciar a empleados para llevar todo uno mismo).
- No hay una decisión que cambie la **topología** del pozo (estratos inclinados, cúpula abierta, red de galerías).
- No hay modificadores de partida que cambien la economía o el combate.
- No hay una pantalla de elección de build antes del día 1.

#### Lectura 3D

La asimetría no debe ser solo “más daño o más velocidad”. En 3D, una build distinta debe cambiar **cómo se recorre el espacio**: vertical frente a horizontal, voladura frente a precisión, plantilla frente a soledad, infraestructura frente a movilidad personal. Ese es el espacio propio de Carbon Magnate.

#### Veredicto

**Ausente. Prioridad alta para Fase 3.** Es el motor que da rejugabilidad sin necesidad de duplicar contenido.

---

### 1.7 Motor 6 — Misiones secundarias in-situ

#### Qué existe

- Cofres deterministas con pasivas (`CHEST_REWARDS`, `src/config.ts:571-575`).
- La pasiva se elige de forma determinista a partir de `seed:nodeId:chest` (según `CLAUDE.md` y `world-determinism`).
- No hay NPCs, encargos, objetivos físicos, estados de misión ni recompensas únicas.

#### Lo que falta

Los cofres son **azar pasivo**: el jugador los encuentra, los abre y recibe un multiplicador. No le piden ir a un sitio concreto, cargar un objeto, sellar una fuga, rescatar una sonda ni volver con vida. No crean una ruta alternativa ni una decisión de tiempo.

En 3D, una misión in-situ tiene una ventaja enorme: puede usar el espacio como objetivo. Encontrar una cámara de servicio, orientarse hasta ella, llevar una herramienta, instalar un anclaje o escoltar una cápsula son acciones que no existen en un juego 2D de cuadrícula.

#### Qué falta concretamente

- Módulos o cámaras de misión deterministas, con señal y estado.
- Objetivos físicos en 3D: localizar, cargar, instalar, sellar, rescatar.
- Recompensas de utilidad que el dinero no pueda comprar.
- Un límite de ranuras de utilidad para que la recompensa sea una elección, no una acumulación.
- Estado compartido en cooperativo y snapshot de late join.

#### Veredicto

**Ausente. Prioridad media-alta para Fase 3.** Es el sistema que convierte la exploración en contenido sin añadir un mapa nuevo.

---

### 1.8 Motor 7 — Feedback de progresión y narrativa ambiental

#### Qué existe

- Ciclo día/noche con progreso del turno (`SkyCycle.update`, `Environment.update`).
- Tolva física que crece con la cuota y una fracción del valor del día (`Hopper.update`).
- Oficina nocturna, carteles, zona segura, paisaje procedural y render pixel art exterior (`src/world/Environment.ts`, `src/world/Landscape.ts`, `src/world/SkyCycle.ts`).
- Liquidación con desglose por mineral, rendimiento y bonus (`src/core/DaySettlement.ts`, `UI.showDaySummary`).
- HUD con cuota, capital, profundidad, capa, tolva, peso y empleados.

#### Lo que falta

- **La superficie no evoluciona.** El bosque, las montañas, la oficina y el cielo son los mismos en el día 1 y en el día 15. La tolva crece, pero el mundo no cuenta lo que ha costado llenarla.
- **El HUD es contable, no narrativo.** “Capital” no se llama así en la UI; no hay lectura de presión de contrato, carga asegurada, retorno estimado ni huella.
- **Los números grandes no se leen.** `formatMoney()` usa `Intl.NumberFormat` completo; no hay sufijos, notación científica ni modo auditoría (`src/ui/format.ts:5-11`).
- **El cierre no tiene “coste”.** La liquidación muestra lo extraído y el bonus, pero no el impacto ambiental ni el estado del claro.
- **El audio de aviso existe y no se usa.** `playQuotaWarning()` está implementado y la auditoría lo marca como no invocado. Es una oportunidad directa para el reloj de 30/15/5 s.

#### Lectura 3D

El crecimiento del jugador debe leerse **desde la superficie**: el montón de estéril, los árboles muertos, el hundimiento del terreno, la oficina ampliada y el cielo más turbio. Ese contraste entre el pixel art natural del claro y el low-poly orgánico del pozo ya existe; solo hay que hacerlo progresar.

#### Veredicto

**Parcial. Prioridad media.** La Fase 1 puede arreglar la semántica del HUD y el acta de extracción; la Fase 4 puede llevar la degradación del mundo al endgame.

---

### 1.9 Brechas transversales de 3D

| Problema 3D | Estado actual | Consecuencia | Sistema propuesto |
|---|---|---|---|
| Orientación bajo tierra | Sin brújula, mapa ni balizas | El jugador se pierde y no puede planificar el regreso | Reloj de retorno, rumbo a tolva, plano de galerías, balizas |
| Volumen de excavación | Radio esférico; volumen cúbico | Explosiones y pasivas de radio multiplican roca, partículas y malla | Fórmula de radio efectivo, topes, cargas conformadas |
| Transporte en 3 ejes | Escaleras manuales, jetpack tardío, recolectores | El recorrido se vuelve tedioso, no táctico | Cabria, tolva de campaña, cinta de retorno, plataforma móvil |
| Iluminación y lectura | Linterna y brillos procedurales | Profundidad y vetas se leen mal a distancia | Faros de capa, emisivos, filtro de polvo, audio direccional |
| Pathfinding de aliados | Búsqueda lineal de nodos; vuelo en línea recta | No escala a brigadas ni a túneles complejos | Sectores, LOD híbrido, grafo de pasabilidad |
| Cámara y *game feel* | Micro-shake y FOV fijo | Explosiones masivas pueden marea o tapar la acción | Presupuesto sensorial, *trauma* con tope, accesibilidad |

### 1.10 Lo que ya funciona y no se debe romper

- **Determinismo:** semilla del host, `mulberry32`, IDs con día y orden terreno → recursos → carves → nodos. Cualquier sistema nuevo debe respetarlo.
- **Autoridad del host:** cuota, reloj, fin de día, compras, cofres y plantilla. Los clientes predicen, no deciden.
- **No se envían mallas:** solo eventos, IDs, estados y depósitos agregados.
- **Carga local hasta la tolva:** recoger no acredita; depositar sí. La mochila no se replica.
- **Jetpack bloqueado a nivel 0:** la compra tardía es parte del bucle.
- **Escaleras consumibles y de equipo:** stock persistente; instancias colocadas se limpian al día.
- **Empleados individuales:** máximo 6 registros con `id`, `kind`, `rank`; cualquier brigada futura debe ser un registro, no un contador global.
- **Arte y audio 100 % procedurales; UI en español.**
- **Compatibilidad navegador/Electron y protocolo versionado.**

## 2. Propuestas de adaptación original al entorno 3D

### 2.0 Regla de abstracción: qué se toma y qué no

| Principio abstracto del referente | Lo que **no** se copia | Sistema original de Carbon Magnate |
|---|---|---|
| Recurso de supervivencia frente a recurso de progresión | Nombres, valores, tiers y fantasía del carbón/oro ajenos | **Cuota de carbono** + **Capital de reposición** + **prima de puntualidad** |
| Rendimiento decreciente al profundizar | Fórmulas exactas y tabla de biomas ajena | **Ley de merma de estrato**: carbón profundo con más HP por tonelada útil |
| Omisión de estratos ya superados | “Borrar capas”, nombres y orden de capas ajenos | **Plataforma de servicios móvil** y **cierre de capa con relleno de estéril** |
| Automatización del transporte por radio | Aspiradoras, NPCs, nombres y alcances ajenos | **Tolva de campaña** + **cinta de retorno** + **cabria de contrapeso** |
| Misiones con recompensas no comprables | Mascotas, NPCs y aparatos de succión ajenos | **Encargos de galería** + **certificaciones de campo** + ranuras de utilidad |
| Arquetipos que prohíben sistemas | Nombres, número y reglas de las profesiones ajenas | **Actas de operación** con prohibiciones y ventajas propias |
| Variantes topológicas | Nombres y geometrías de mapas ajenos | **Cubo de sondeo**, **falla de cizalla**, **cúpula de subsidencia** |
| Números grandes legibles | Sufijos y notación ajenos | **Libro mayor**: sufijos propios, notación científica y modo exacto |

**Regla operativa:** si una propuesta necesita el nombre, la cifra o el texto de otro juego para funcionar, la propuesta está mal abstraída. Todo lo que sigue se puede explicar con la fantasía de Carbon Magnate y con sus propios verbos: **excavar, asegurar, izar, depositar, certificar, medir, cerrar**.

---

### 2.1 Identidad y fantasía: el Fondo de Sumideros

Carbon Magnate ya tiene una identidad visual fuerte: pixel art natural en la superficie, low-poly orgánico bajo tierra, corporativismo industrial y una tolva que crece como un monumento al rendimiento. La propuesta narrativa no cambia el nombre del juego ni su género; le da una contradicción propia.

**Lectura propuesta:** la empresa que contrata al jugador es **Carbon Magnate**, pero el cliente que paga la cuota es el **Fondo de Sumideros Carboníferos (FSC)**. El FSC vende “captura y estabilización de carbono”; el pozo, en realidad, extrae carbón y lo vende. La superficie se degrada porque el negocio consiste en vaciar el subsuelo mientras se firman actas de sostenibilidad. No hace falta un villano caricaturesco: el humor sale de la burocracia, los sellos, las auditorías y el contraste entre el bosque pixelado y el montón de estéril.

**Tono:** seco, administrativo, industrial. Menos humor corporativo genérico; más **“gestor de sumideros” que firma partes de extracción**. La UI ya está en español y usa términos como “cuota”, “liquidación”, “expediente” y “operario”; conviene mantenerlos y añadir “acta”, “cláusula”, “certificación” y “huella”.

**Ejecución visual:**

- El claro inicial es natural y legible: montañas, bosque, cielo, oficina pequeña, tolva.
- La huella de explotación se acumula en la superficie: montón de estéril, árboles muertos, grietas, hundimientos, luces de advertencia, carteles que cambian de tono.
- La oficina no es un menú abstracto: es un edificio físico con placas, archivadores y un tablón de actas. La tienda puede seguir siendo un overlay, pero el mundo debe contar la misma historia.
- Bajo tierra, cada capa tiene una paleta y una lectura de “ley”: el carbón superficial es negro y limpio; el profundo está mezclado con roca estéril, y el mineral valioso brilla más. El jugador debe poder leer la profundidad por color, no solo por el número del HUD.

**Límite:** esta narrativa es una capa de presentación. No debe introducir diálogos largos, NPCs con nombre propio ni una campaña que compita con el bucle. Es ambiental, opcional y procedural.

---

### 2.2 Motor 1 — Cuota de carbono frente a Capital de reposición

#### 2.2.1 Los tres conceptos

| Concepto | Unidad | Fuente | Uso | Qué pasa si falta |
|---|---|---|---|---|
| **Cuota de carbono** | toneladas (t) | Carbón depositado en la tolva | Supervivencia diaria; abrir la oficina | Game over y borrado del expediente |
| **Capital de reposición** | $ | Minerales, gemas, prima de puntualidad y excedente canjeado | Compras, mejoras, infraestructura | No se puede reinvertir; el día sigue siendo válido |
| **Certificaciones de campo** | objetos únicos | Encargos de galería | Utilidades no comprables | Se pierde una vía de build, no la partida |

La regla central es simple: **el carbón no paga capital en la tolva**. El carbón es el recurso de supervivencia; el mineral es el recurso de progresión. Si el carbón también paga capital, la decisión desaparece.

#### 2.2.2 La ley de merma de estrato

La profundidad debe ser una **promesa de capital**, no una promesa de cuota. El carbón profundo es abundante en bruto, pero está más mineralizado y exige más golpes por tonelada útil. La tabla objetivo conserva el early game intacto y corrige la inversión:

| Capa | Mineral de carbón | HP | Carbón actual | Carbón objetivo | Capital actual | Capital objetivo | Carbón/HP actual | Carbón/HP objetivo |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Carbón Común | 26 | 8 | **8** | 8 | **0** | 0,308 | **0,308** |
| 2 | Carbón Denso | 54 | 24 | **14** | 24 | **0** | 0,444 | **0,259** |
| 3 | Carbón Presurizado | 104 | 72 | **20** | 72 | **0** | 0,692 | **0,192** |
| 4 | Carbón Puro | 178 | 300 | **30** | 300 | **0** | 1,685 | **0,169** |

Lectura:

- La capa 1 no cambia: el día 1 sigue siendo el tutorial de “carbón = cuota”.
- Las capas 2–4 reducen el carbón por HP. El carbón profundo sigue existiendo y puede usarse para cubrir la cuota si el jugador va justo, pero no es la mejor inversión por golpe.
- Los minerales de capital no cambian: cobre, hierro, amatista, oro, rubí, esmeralda y diamante siguen recompensando la profundidad. El diamante ya rinde 4,0 $/HP frente a 0,44 del cobre; esa curva se conserva.
- El nombre “Carbón Puro” puede mantenerse si se explica como **“puro en carbono, pobre en ley contractual”**, o renombrarse a **“Carbón Abisal”**. La decisión de naming es de contenido; la mecánica no depende de ella.

**Regla de diseño:** ningún carbón debe superar a un mineral de capital en $/HP. Esa es la prueba de que la doble divisa está funcionando.

#### 2.2.3 Prima de puntualidad

Para que el reloj no sea solo un fracaso, la eficiencia del regreso debe pagar:

- Se registra el instante en que la cuota queda cubierta por primera vez (`securedAt`).
- Si la cuota se cubre en el primer 25 % del turno, la prima puede llegar al **12 % del valor de minerales depositados**.
- Si se cubre entre el 25 % y el 75 %, la prima baja linealmente hasta 0.
- Si se cubre en el último 25 %, no hay prima.
- La prima se paga en capital, no en cuota, y solo si el día termina con éxito.

Fórmula propuesta, a calibrar:

```text
speedRatio = 1 - securedAt / dayDuration
punctuality = round(oreValue * 0.12 * clamp((speedRatio - 0.25) / 0.75, 0, 1))
```

Esto premia asegurar la cuota y volver a invertir, en lugar de exprimir hasta el último segundo. También crea una decisión: ¿merece la pena bajar otra vez con el tiempo justo para una veta, o aseguro la prima?

#### 2.2.4 Excedente: capital inmediato o reserva

El excedente de carbón no debe ser basura. Hay dos opciones de diseño; se recomienda empezar por la primera y evaluar la segunda en Fase 3:

1. **Canje de excedente (MVP):** al cerrar el día, `surplus = max(0, carbon - quota)` se convierte en capital a **0,20 $/t**, con un tope del 20 % del valor de minerales del día. Es una propina, no una segunda economía.
2. **Fondo de reserva (Fase 3):** el jugador elige entre canjear el excedente o guardarlo como reserva para la cuota del día siguiente, hasta un 20 % de la cuota próxima. La reserva se consume primero y no paga capital. Crea una decisión real entre seguridad y crecimiento.

La segunda opción es más profunda, pero añade estado persistente y UI; no debe entrar en la Fase 1.

#### 2.2.5 Ejecución 3D

- **Tolva de doble boca:** la tolva actual puede separar visualmente dos flujos: una boca negra para carbón de contrato y una boca con brillo de mineral para capital. El montón crece con la cuota; el mineral se acumula en una bandeja lateral. Es una lectura física de la doble divisa.
- **Apuntado con ley:** al mirar un carbón, el panel de apuntado muestra `CARBÓN · LEY 0,31` o `LEY 0,17` y una frase corta: “Rinde cuota; no rinde capital”. Al mirar un mineral, muestra su valor de capital y su HP.
- **Paleta por capa:** el carbón profundo se ve mezclado con vetas estériles; el mineral valioso tiene un emisivo más limpio. La diferencia se lee antes de picar.
- **HUD:** tres bloques separados: `CUOTA`, `CARGA NO ASEGURADA`, `CAPITAL`. Nunca mezclar el carbón de la mochila con la cuota depositada.
- **Oficina:** la tienda habla de “capital de reposición”, no de “dinero”; la liquidación muestra “cuota cubierta”, “capital por minerales”, “prima” y “canje de excedente”.

#### 2.2.6 Impacto técnico y de datos

- `MINERALS` en `src/config.ts`: cambiar `carbonYield` y `moneyYield` de los cuatro carbones; no tocar los minerales de capital.
- `applyTeamDeposit()` no necesita cambiar de forma: el carbón ya llega con `money = 0`.
- `DaySettlement.buildDayReport()` y `DayReport` necesitan `punctuality`, `surplusCarbon`, `surplusCapital` y quizá `securedAt`.
- `HudViewData` y `UI.updateHud()` necesitan la separación semántica y la ley de carbón.
- No hay cambio de guardado obligatorio: `run.carbon` y `run.money` ya existen. La prima y el canje se calculan al cerrar el día.
- Tests nuevos: eficiencia carbón/HP por capa, depósito sin capital de carbón, prima, canje, liquidación.

#### 2.2.7 Criterio de aceptación

- [x] El carbón nunca suma capital al depositarse.
- [x] `carbón/HP` decrece de capa 1 a capa 4.
- [x] Ningún carbón supera a un mineral de capital en $/HP.
- [x] La cuota de los días 1–5 sigue siendo alcanzable con la tabla actual.
- [ ] Un jugador nuevo puede explicar en una frase la diferencia entre cuota y capital después del Día 1.

---

### 2.3 Motor 2 — Reloj de retorno y carga física

#### 2.3.1 Reloj de retorno

El HUD actual muestra el tiempo restante, pero no responde a la pregunta que importa: **“¿me da tiempo a volver?”**. El reloj de retorno es una estimación local, no autoritativa. En la Fase 1 se aproxima con distancia, desnivel y escaleras; el grafo completo llega en la Fase 2:

- Se construye un grafo de pasabilidad de 2 m a partir de la densidad del terreno y de los carves recientes.
- Los nodos son celdas de aire; las aristas conectan vecinos con desnivel ≤1 m; las escaleras y cabrias añaden aristas verticales.
- Se calcula una ruta desde la posición del jugador hasta la tolva, con un factor de seguridad de 1,15.
- El resultado se muestra como `REGRESO 00:42` en verde, ámbar o rojo; si no hay ruta, `SIN RUTA · BUSCA ESCALERA`.
- Se actualiza 2 veces por segundo y solo en un radio de 64 m; no se envía por red.

Fórmula inicial:

```text
t_return = (longitudRuta / velocidadBase)
         + (desnivelPositivo / velocidadEscalada)
         + (nEscaleras * 0.8 s)
         + 1.0 s de margen
```

Si el jugador lleva carga crítica, se aplica el multiplicador de lastre. La estimación no necesita ser perfecta: necesita ser **honesta y estable**.

#### 2.3.2 Rumbo a la tolva

Una brújula de contrato siempre visible, discreta:

- Rumbo horizontal a la tolva (flecha en una cinta de brújula).
- Diferencia vertical (`+18 m`, `−42 m`).
- Distancia euclídea y, si existe, distancia de ruta.
- Latido de audio direccional cuando el tiempo restante baja de 30 s.

La brújula no revela el mapa; solo la dirección de casa. El **plano de galerías** completo es una certificación de misión (ver 2.7), no una ayuda inicial.

#### 2.3.3 Carga crítica y derrame

No hace falta un sistema de salud para que la verticalidad pese. La carga puede ser el riesgo:

- Por encima del **80 % del peso máximo**, el operario pierde un 10 % de velocidad de sprint y de escalada. La mochila se siente.
- Una caída de más de 6 m con carga crítica derrama entre un 5 % y un 10 % de las piezas, que quedan en el suelo y se pueden recuperar. No se destruyen; se dispersan.
- El derrame no se aplica si el jugador está usando una cabria, una rampa o una escalera; solo en caída libre o salto.
- El HUD avisa `CARGA CRÍTICA · 86 %` y el prompt de la tolva cambia a `E · ASEGURAR CARGA`.

Esto convierte la verticalidad en una decisión física y no en un castigo arbitrario.

#### 2.3.4 Tolva de campaña

Un punto de acopio intermedio, no un segundo hogar:

- Se coloca en suelo plano, como una escalera, con un máximo de 2 por día.
- Almacena hasta el 30 % de la capacidad de la mochila; **no acredita cuota ni capital**.
- El jugador puede depositar y retirar; un recolector o una cinta puede transportar su contenido a la tolva.
- Si el día termina, la carga de la tolva de campaña se pierde como la mochila.
- Coste: capital moderado + una certificación de logística o una mejora de tienda.

Sirve para decidir “aseguro esta carga a mitad de túnel y sigo a por la veta”, sin eliminar el viaje final a la tolva.

#### 2.3.5 Ejecución 3D

- **Reloj de retorno** en la esquina del HUD, junto al tiempo restante; no lo sustituye.
- **Cinta de brújula** en la parte superior, con la tolva marcada y un pequeño indicador de verticalidad.
- **Tolva de campaña** como objeto físico con baliza; su contenido se ve en una ventana de cristal y se puede retirar.
- **Derrame** con una animación de piezas que caen, rebotan y quedan brillando; el jugador puede recuperarlas si tiene tiempo.
- **Audio** de aviso con `playQuotaWarning()` a 30, 15 y 5 s, con paneo hacia la tolva.

#### 2.3.6 Criterio de aceptación

- [x] El jugador puede ver una estimación de regreso antes de quedarse sin tiempo.
- [x] La estimación no promete una ruta que no existe: si no hay paso, lo dice.
- [x] La carga crítica se nota en el movimiento y en el riesgo, no solo en el número.
- [x] La tolva de campaña no acredita cuota; solo almacena.
- [x] El jugador puede recuperar al menos una parte de una carga derramada.

---

### 2.4 Motor 3 — Movilidad, logística y omisión de fricción

#### 2.4.1 Escalera de progresión

La progresión de fricción debe ser una escalera de **acceso**, no solo de velocidad:

| Nivel | Sistema | Fricción que elimina | Cómo se obtiene | Expresión 3D | Fase |
|---|---|---|---|---|---|
| 0 | Escaleras actuales | Subir una pared o un desnivel | Stock inicial y tienda | Fantasma, dial, puentes, rampas | Ya existe |
| 1 | **Arnés de rappel** | Colocar una escalera para cada descenso corto | Certificación de misión o compra | Descenso rápido por una cuerda anclada; sin inventario de escaleras | 2 |
| 2 | **Cabria de contrapeso** | El ascenso manual de un tramo vertical largo | Capital + anclaje + línea despejada | Cable, polea y jaula; sube al jugador y su carga | 2 |
| 3 | **Jetpack** | La dependencia total de la ruta | Compra tardía | Propulsión y combustible | Ya existe |
| 4 | **Tolva de campaña** | Volver entero para asegurar una parte | Capital + certificación | Contenedor con baliza y ventana | 2 |
| 5 | **Cinta de retorno** | Recoger cada pepita a mano | Capital + módulos | Cinta modular que arrastra fragmentos | 3–4 |
| 6 | **Plataforma de servicios móvil** | Volver a empezar desde la superficie | Cierre de capa + capital + cuota | La base desciende con el pozo; el estéril se acumula arriba | 3–4 |

La regla es: **ningún nivel elimina el viaje a la tolva**. Lo hace más corto, más seguro o más automático, pero la tolva sigue siendo el punto de conversión.

#### 2.4.2 Cabria de contrapeso

- Se ancla a la plataforma segura o a una pared vertical; exige una línea vertical despejada de al menos 3 m y se prolonga automáticamente hacia abajo a medida que se profundiza el pozo.
- Tiene un carrete de cable y una jaula; el jugador se engancha con `E` y sube o baja a 8 m/s.
- Consume una unidad de cable por instalación; el stock es de equipo, como las escaleras.
- No se puede colocar a través de roca, mineral o la plataforma; el fantasma lo indica en rojo.
- En cooperativo, la colocación viaja como `winch_place`; el host valida el anclaje y el stock; el snapshot incluye cabrias.

La cabria es la respuesta 3D a “necesito una ruta vertical expresa sin convertir el juego en un ascensor automático”. Es visible, física y limitada por el espacio.

#### 2.4.3 Cinta de retorno

- Módulos de 3 m que se colocan sobre suelo plano o rampas suaves.
- Atraen fragmentos en un radio de 2 m y los desplazan por la cinta hasta la tolva o hasta una tolva de campaña.
- Límite de 32 módulos por día; cada módulo consume una unidad de stock.
- No transporta minerales de nodos sin romper; solo fragmentos ya liberados.
- El host valida la ruta y el consumo; los clientes ven la cinta y su animación.
- Es una automatización **espacial y visible**: la cinta puede quedar bloqueada por un derrumbe y hay que despejarla.

#### 2.4.4 Plataforma de servicios móvil: la omisión de capas

En lugar de “borrar” capas, la empresa **cierra** la capa superada:

1. Al cumplir la cuota de una capa y pagar un **acta de cierre**, la compañía rellena los túneles superiores con estéril y hace descender la plataforma de servicios.
2. La plataforma contiene el spawn, la tolva, la oficina y el punto de compra; baja en incrementos de 25 m.
3. El terreno superior queda como un **tapón de estéril** visible desde la superficie; el montón de estéril y el hundimiento crecen.
4. El jugador empieza el día siguiente en la nueva cota, más cerca de las capas profundas, pero el viaje a la tolva sigue existiendo dentro de la nueva cota.
5. El estado viaja como `platformDepth` en `DaySnapshot`; el guardado lo conserva; el protocolo sube de versión.

Esta es la abstracción propia de “omitir estratos superados”: no se borra el mundo, se **entierra** y se convierte en huella ambiental. Es coherente con la fantasía del Fondo de Sumideros: la empresa tapa lo que ya no le renta.

**Alternativa de menor riesgo para Fase 2:** un **tiro de servicio** vertical con cabria que conecta la superficie con un checkpoint de profundidad, sin mover la plataforma. Elimina el descenso repetido, pero no la capa. La plataforma móvil puede esperar a Fase 3/4 si la arquitectura de `SURFACE_DECK_Y`, spawn, oficina, tolva y snapshot se vuelve demasiado cara.

#### 2.4.5 Ejecución 3D y límites

- Toda infraestructura debe tener **anclaje físico**: pared, suelo, plataforma o cable. No hay objetos flotantes.
- La cinta y la cabria se dibujan con geometría procedural y se pueden inspeccionar desde la primera persona.
- El jugador debe poder **ver la ruta** desde el objeto: un cable, una cinta, una baliza. La logística no es un menú.
- Los límites de stock y de módulos evitan que el pozo se convierta en una fábrica sin decisiones.
- La plataforma móvil requiere un cambio de arquitectura grande; no debe entrar en la Fase 1.

#### 2.4.6 Criterio de aceptación

- [x] El tiempo medio de retorno desde 80 m baja al menos un 30 % con la cabria.
- [x] Las escaleras siguen siendo útiles después de la cabria; ninguna queda obsoleta.
- [x] La cinta no teletransporta minerales: los mueve por un recorrido visible.
- [x] La tolva de campaña no acredita cuota.
- [x] La plataforma móvil, si se implementa, no elimina la tolva ni el viaje de retorno.

---

### 2.5 Motor 4 — Curva de escalado, patentes y conversión de excedentes

#### 2.5.1 Curva de tres bandas

| Banda | Días | Fuente principal de poder | Curva de coste | Curva de cuota | Sensación |
|---|---|---|---|---|---|
| Early | 1–5 | Mejoras aditivas (+12 % daño, +6 % cadencia) | ×1,55 por nivel | ×1,8–2,25 por día | Aprender el bucle; cada compra se nota |
| Mid | 6–15 | Patentes de herramienta + pasivas de cofre | ×4–5 por patente | ×1,5 por día | Romper el juego; el poder salta |
| Late | 16+ | Patentes + sinergias de acta + brigadas/infraestructura | Multiplicativa | ×1,55–1,7 por día | Números grandes; el rendimiento es el freno |

La tabla de cuotas de los días 1–15 puede mantenerse en la Fase 1. La curva ×1,55 del modo infinito solo debe activarse **después** de introducir las patentes y la conversión de excedentes; si se activa antes, el jugador se estanca.

#### 2.5.2 Patentes de perforación

Una capa de poder cualitativa, no una lista de minerales ajena:

- **Patentes I–VI**, comunes a todas las herramientas.
- Cada patente multiplica el daño de minado ×2,4 y la potencia de excavación ×1,8; cambia el color del emisivo de la herramienta y el tono del impacto.
- Se desbloquean por hitos de profundidad y capital, no solo por dinero: `Patente III` exige haber roto un nodo en la capa 3.
- El coste crece ×4,2 por patente; el ingreso crece por acceso a capas más ricas y por la propia patente. La curva no debe ser “más de lo mismo”: cada patente debe abrir una nueva forma de juego (por ejemplo, la II permite romper vetas semienterradas sin exponerlas, la IV reduce el desgaste de la broca en basalto, la VI permite cargas conformadas).
- La herramienta no cambia de malla por completo (coste de arte), pero sí de emisivo, sonido y partículas. Es una progresión legible con recursos procedurales.

#### 2.5.3 Pasivas de cofre con curva

Sustituir la linealidad actual por una curva con techo y conversión:

```text
bruto(L) = 1 + 0.06 L + 0.004 L²
M(L) = min(6, bruto(L))
excedente(L) = max(0, bruto(L) - 6)
```

| Nivel L | Bruto | Multiplicador efectivo | Lectura |
|---:|---:|---:|---|
| 1 | 1,064 | 1,064 | Un poco mejor |
| 5 | 1,40 | 1,40 | Se nota |
| 10 | 2,00 | 2,00 | Punto de inflexión |
| 20 | 3,80 | 3,80 | Poder claro |
| 30 | 6,40 | 6,00 | Excedente convertible |

El tope no se “pierde”: se convierte. La UI debe mostrar `MÁXIMO · EXCEDENTE → DAÑO` y el valor convertido.

#### 2.5.4 Conversión de excedentes

| Estadística topada | Excedente se convierte en | Ratio inicial | Por qué |
|---|---|---|---|
| Cadencia | Daño por golpe | 1 % de cadencia → 0,5 % de daño | La animación no puede ser infinita; el golpe se vuelve más contundente |
| Radio de excavación | Fractura dirigida (daño a nodo) | 10 % de radio → 8 % de fractura | Evita que el volumen cúbico destruya el rendimiento |
| Imán | Radio de auto-recogida | 1 m de imán → 0,25 m de auto-recogida | El jugador sigue sintiendo que recoge |
| Velocidad de empleados | Rendimiento de brigada | 10 % de velocidad → 4 % de rendimiento | La simulación estadística no necesita mover más agentes |
| Capacidad de mochila | Valor de carga o velocidad con lastre | 20 kg → +3 % de velocidad con carga | El peso deja de ser solo un límite |
| Combustible de jetpack | Recarga en suelo | 20 de combustible → +8 % de recarga | El jetpack no se vuelve infinito |

Las ratios son puntos de partida; lo importante es que **ninguna mejora se desperdicie en silencio**.

#### 2.5.5 Volumen 3D: el radio no puede crecer al cubo

La fórmula actual de radio es lineal, pero el volumen de una esfera es `4/3 π r³`. Un +8 % de radio es +26 % de volumen; un +60 % es +310 %. Para que el escalado sea sano:

```text
r_efectivo = min(r_tope, r_base * (1 + bonus_radio)^(1/3))
exceso = max(0, (1 + bonus_radio)^(1/3) - r_tope / r_base)
fractura_extra = 1 + 0.8 * log2(1 + exceso)
```

Topes propuestos:

| Herramienta | Radio base | Tope | Qué pasa al superarlo |
|---|---:|---:|---|
| Pico | 0,15 m | 1,0 m | El exceso se convierte en fractura dirigida |
| Taladro | 1,12 m | 1,6 m | El exceso aumenta daño y velocidad de avance, no radio |
| Granada esférica | 3,4 m | 4,0 m | El exceso se convierte en daño a nodos y en onda de choque |
| Carga conformada | — | Cápsula/cono | El volumen se limita por la forma, no por el radio |

**Cargas conformadas:** las granadas de tiers altos pueden adoptar una forma de **cápsula orientada** (taladro direccional) o **cono** (embudo). Esto reduce el volumen destruido, mejora el rendimiento y da una decisión táctica: abrir un túnel recto, una cámara o una rampa. El `GrenadeDefinition` actual no tiene forma ni longitud: habría que añadir `shape` y `length`, sin cambiar el área de daño común.

#### 2.5.6 Números grandes

- **Backend:** `BigValue` con mantisa y exponente, o `BigInt` con unidad fija. Se usa para cuota, capital, estadísticas y precios; las posiciones y daños siguen en `number`.
- **Wire:** los valores grandes viajan como cadenas (`"1.23e9"` o `"1230000000"`), nunca como `number` si superan `Number.MAX_SAFE_INTEGER`.
- **Formato:** `k`, `M`, `MM` y notación científica según la tabla de 3.6.3; coma decimal española. Ejemplos: `1,25 M t`, `$ 3,40×10⁹`.
- **Modo Libro Mayor:** un toggle en la oficina y en la liquidación que muestra el valor exacto con separadores y el redondeo usado. La UI normal muestra la versión corta; el tooltip, la exacta.
- **Precisión:** no redondear el estado interno al mostrar; el redondeo es solo de presentación. La liquidación debe cuadrar al céntimo/unidad.

#### 2.5.7 Criterio de aceptación

- [x] Ninguna estadística topada desperdicia una mejora sin avisar.
- [x] El radio de excavación tiene tope y el exceso se convierte en daño/fractura.
- [x] La cuota del día 15 sigue siendo alcanzable con la curva de patentes.
- [x] El día 25 es difícil pero no imposible con una build completa.
- [x] Los números grandes se leen sin perder precisión.
- [x] El jugador puede explicar qué hace una patente, no solo cuánto daño suma.

---

### 2.6 Motor 5 — Actas de operación, topologías y cláusulas

#### 2.6.1 Actas de operación

Un **Acta de operación** es un arquetipo de partida que prohíbe o altera sistemas enteros. Se elige al inicio de la expedición y se comparte con el equipo (recomendación: doctrina de equipo, no por jugador, para no multiplicar reglas en cooperativo).

| Acta | Fantasía | Ventaja | Prohibición / coste | Expresión 3D |
|---|---|---|---|---|
| **Acta de Voladura** | El operario que abre túneles con carga | Granadas −30 % de coste, +20 % de volumen, cargas conformadas | Pico −25 % de daño; mineral −10 % de valor por rotura | Túneles rectos y cámaras; el jugador destruye más roca de la que vende |
| **Acta de Cuadrilla** | El capataz que no baja solo | Empleados empiezan en rango 1; contratación −25 % | Sin jetpack; capacidad personal −25 %; cuota +5 % | Depende de escaleras, cabrias y recolectores; el equipo es la movilidad |
| **Acta de Precisión** | El topógrafo que extrae sin dañar la veta | Pico/taladro +20 % de daño; capacidad +25 %; mineral +10 % de valor | Sin empleados | Soledad, rutas selectivas, lectura de vetas y retorno calculado |
| **Acta de Flete** | El logista que convierte el pozo en una cinta | Tolvas de campaña y cintas −30 %; capacidad de campaña +50 % | Sin mineros; pico −15 %; cuota +10 %; −10 s de turno | La progresión es la red de transporte, no el DPS |

Cada acta debe tener **una prohibición que se sienta**, no solo un modificador numérico. Si todas las actas pueden comprar lo mismo, no hay asimetría.

#### 2.6.2 Topologías de pozo

| Topología | Qué cambia | Desafío 3D | Herramientas que favorece | Fase |
|---|---|---|---|---|
| **Cubo de sondeo** | La actual: cubo macizo de 48 × 48 × 120 m | Orientación y retorno | Todas; línea base | Ya existe |
| **Falla de cizalla** | Estratos inclinados 25–40°, bandas duras y blandas alternas | El “abajo” ya no es una línea recta; las rampas y la lectura de buzamiento son clave | Rampas, taladro, cartografía | 3 |
| **Cúpula de subsidencia** | Gran vacío central con islas de mineral y puentes de escombro | Caída, carga, tiro vertical y aterrizaje | Jetpack, escopeta, cabria, cinta | 3–4 |
| **Panal de servicio** | Red de tiros y galerías preexistentes; mineral en pilares | Intersecciones, visibilidad y bloqueo de rutas | Balizas, plano, cintas, recolectores | 4 |

La topología no debe ser un “skin”: debe cambiar la ruta, la luz y el riesgo. La generación sigue siendo determinista y se distribuye por semilla; el host elige topología antes del día y la envía en el snapshot.

#### 2.6.3 Cláusulas de la junta

Modificadores de partida, opcionales y combinables, que cambian una regla:

| Cláusula | Efecto | Qué build castiga | Qué build premia |
|---|---|---|---|
| **Auditoría sorpresa** | Cuota +15 %; bonus +50 % | Builds lentas | Builds de precisión y puntualidad |
| **Corte de suministros** | No se venden escaleras ni granadas; mineral +20 % | Builds de infraestructura barata | Builds de pico/taladro y movilidad |
| **Estrato sellado** | Una capa no tiene carbón; la cuota no baja | Builds que dependen de una sola capa | Builds de reserva y logística |
| **Polvo en suspensión** | Visibilidad −30 %; linterna más estrecha; mineral brilla más | Builds sin orientación | Sonda de vetas, filtro de polvo, balizas |
| **Turno corto** | −20 s; prima de puntualidad +50 % | Builds de recogida lenta | Builds de retorno rápido y auto-recogida |
| **Mina espejo** | Orden de capas invertido: el mineral raro está arriba y el carbón abajo | Builds de profundidad | Builds de exploración y logística inversa |

Las cláusulas se eligen en la oficina antes del día; en cooperativo, las elige el host. Deben ser legibles en la barra superior de la tienda y en el HUD.

#### 2.6.4 Ejecución 3D y alcance

- La doctrina se elige en una pantalla de **acta** con un sello, una frase y una lista de prohibiciones; no un menú de clases genérico.
- La topología se presenta como un **mapa de sondeo** en la oficina, con una silueta 3D y una advertencia.
- Las cláusulas se presentan como **sellos de la junta** en la barra superior.
- En cooperativo, la doctrina es de equipo; las builds individuales se reservan para una expansión posterior. Si se permite doctrina individual, el host debe validar combinaciones y la cuota compartida puede romperse.

#### 2.6.5 Criterio de aceptación

- [x] Hay al menos 4 actas jugables y ninguna es dominante.
- [x] Cada acta prohíbe un sistema que el jugador echará de menos.
- [ ] Hay al menos 2 topologías además del cubo.
- [x] Las cláusulas se pueden combinar sin hacer la partida imposible.
- [x] La doctrina de equipo se sincroniza y se guarda.

---

### 2.7 Motor 6 — Encargos de galería y certificaciones

#### 2.7.1 Módulos de servicio

Para que haya misiones in-situ sin romper la invariante de “cubo macizo sin cuevas naturales”, las misiones viven en **módulos de servicio** prefabricados, enterrados en la roca:

- Son cajas metálicas selladas, de 6 × 4 × 6 m, con una puerta, luces de emergencia y un objeto de misión.
- No son cuevas: son objetos artificiales embebidos en el terreno. El jugador debe excavar hasta ellos.
- Se generan de forma determinista antes que los recursos; la generación de vetas excluye su volumen.
- Emiten una señal de radio con dirección y distancia aproximada; no aparecen en el mapa hasta que el jugador los detecta.
- En cooperativo, el host genera la lista y el estado; el cliente los ve en el snapshot.

**Orden de generación propuesto:**

```text
terreno base → módulos de servicio (metadatos + volúmenes excluidos)
→ recursos → historial de carves → nodos rotos/hp
```

Esto cambia la posición de algunos nodos respecto al mundo actual. Es un cambio de generación compartida: **sube `PROTOCOL_VERSION` y el prefijo PeerJS**. No es un carve de jugador, así que no debe entrar en el historial.

#### 2.7.2 Tipos de encargo

| Encargo | Objetivo físico | Riesgo | Recompensa | Fantasía |
|---|---|---|---|---|
| **Sellado de fuga** | Localizar 3 respiraderos en un módulo y aplicar espuma | Tiempo; el gas reduce la visibilidad | **Filtro de polvo** | El operario que tapa lo que la empresa niega |
| **Rescate de sonda** | Recuperar el núcleo de una sonda y llevarlo a la tolva | Carga extra; el núcleo pesa y brilla | **Plano de galerías** | Cartografiar el pozo con los datos de la sonda |
| **Testigo de sondeo** | Extraer 3 testigos en paredes marcadas de capas distintas | Recorrido vertical; romper la roca correcta | **Sonda de vetas** | Leer la roca antes de picarla |
| **Anclaje de emergencia** | Instalar 3 anclajes en una pared | Altura; caída; colocación precisa | **Arnés de rappel** | Asegurar la ruta para el siguiente turno |

Cada encargo debe costar **tiempo real de turno** (20–40 s) y obligar a desviarse. No debe ser una lista de “recoge 10 objetos” sin espacio: el objetivo debe estar en un lugar concreto, con una geometría que importe.

#### 2.7.3 Certificaciones y ranuras de utilidad

- Una certificación es permanente **durante la expedición actual**; se pierde al fracasar y se guarda mientras el expediente siga vivo.
- El jugador tiene **2 ranuras de utilidad**; puede cambiar las certificaciones equipadas en la oficina.
- No se compran con capital. Algunas pueden requerir una segunda misión para mejorar (nivel I/II), pero nunca dinero.
- En cooperativo, la certificación es de equipo: el host la concede y viaja en el snapshot. Todos los operarios se benefician de la misma utilidad equipada, o cada uno elige de la reserva común; la primera opción es más simple.
- Las utilidades deben ser **cualitativas**: revelar, orientar, reducir una fricción, no sumar +10 % de daño.

#### 2.7.4 Ejecución 3D

- El módulo es un **punto de referencia** en un pozo sin referencias. Su luz de emergencia y su señal ayudan a orientarse.
- El objetivo se manipula en primera persona: aplicar espuma, extraer un testigo, instalar un anclaje, cargar un núcleo.
- La señal de radio se puede escuchar con paneo; el HUD muestra intensidad, no una flecha exacta hasta que el jugador está cerca.
- La recompensa se entrega al volver a la tolva o al completar la acción, según el encargo; el jugador debe decidir si completa el objetivo o vuelve antes del cierre.

#### 2.7.5 Red y determinismo

- Nuevos mensajes: `mission_state` (host → clientes), `mission_complete` (cliente → host), `certification` (host → clientes).
- El snapshot incluye módulos, estado de objetivos y certificaciones.
- El host valida la finalización; el cliente no concede recompensas.
- Los módulos se regeneran cada día con la semilla; las certificaciones obtenidas no se regeneran.
- Guardado v7: `certifications`, `utilitySlots`, `missionsCompleted` y `doctrine`.

#### 2.7.6 Criterio de aceptación

- [ ] Hay al menos 3 encargos jugables y cada uno usa una mecánica 3D distinta.
- [ ] Las recompensas no se pueden comprar con capital.
- [ ] Las 2 ranuras de utilidad obligan a elegir.
- [ ] El late join recibe módulos y certificaciones sin reiniciar.
- [ ] Ningún encargo es obligatorio para sobrevivir al día 15.

---

### 2.8 Motor 7 — Huella de explotación, HUD y acta de extracción

#### 2.8.1 Etapas de la superficie

La huella se deriva de estadísticas que ya existen (`daysCompleted`, `coalMined`, `nodesBroken`) más el estado de la plataforma móvil si se implementa. No hace falta un guardado nuevo para la primera versión.

| Etapa | Días | Claro | Cielo | Oficina | HUD |
|---|---|---|---|---|---|
| 0 | 1–3 | Bosque intacto, montañas limpias | Mañana clara, noche estrellada | Oficina pequeña, cartel neutro | “OPERACIÓN INICIAL” |
| 1 | 4–7 | Montón de estéril, hierba pisada, primeras grietas | Bruma leve | Ampliación de chapa, luces | “RÉCORD DE EXTRACCIÓN” |
| 2 | 8–12 | Árboles muertos, socavones, agua estancada | Cielo más turbio; atardecer más largo | Archivo, carteles de auditoría | “ZONA EN REVISIÓN” |
| 3 | 13–15 | Cráter visible, borde de seguridad, luces rojas | Noche anaranjada, polvo | Oficina blindada, sellos | “ZONA DE SACRIFICIO” |
| 4 | 16+ | Paisaje industrial sin skyline; el claro ya no es natural | Cielo permanente de ceniza | Monumento a la productividad | “OPERACIÓN ILIMITADA” |

La etapa se aplica al **empezar el día**, no por frame. Usa geometría procedural, canvas para carteles, instancias para árboles muertos y cambios de niebla/luz. No se añaden imágenes externas.

#### 2.8.2 Acta de extracción

La liquidación actual ya desglosa minerales, rendimiento y bonus. Se amplía con:

- **Cuota cubierta** y **tiempo en cubrirla**.
- **Capital por minerales**, **prima de puntualidad** y **canje de excedente**.
- **Coste ambiental** (texto narrativo, sin penalización): “12.400 t de estéril; 3,2 ha de bosque afectadas; 2 pozos sellados”.
- **Huella**: etapa de superficie y cambio respecto al día anterior.
- **Eficiencia**: capital por minuto, cuota por viaje, mineral por HP.
- **Certificaciones** obtenidas o equipadas.

El acta no debe ser solo una tabla: es la pieza narrativa que conecta el número con el mundo. Se muestra antes de la oficina, como ahora, pero con una línea de “consecuencia” y un sello.

#### 2.8.3 HUD semántico

El HUD actual tiene los datos correctos, pero no la jerarquía. Propuesta:

- **Barra de presión de contrato:** cuota depositada / cuota, con marcas de “seguro”, “en riesgo” y “cobertura”.
- **Carga no asegurada:** carbón y capital en la mochila, con peso y valor; nunca se suma a la cuota.
- **Capital de reposición:** separado del carbón; icono de lingote o factura.
- **Reloj de retorno:** junto al tiempo, no en otro rincón.
- **Rumbo a tolva:** cinta de brújula y diferencia vertical.
- **Profundidad y capa:** ya existe; añadir la “ley” del carbón.
- **Certificaciones:** dos ranuras con iconos; no una lista larga.

La UI debe seguir siendo DOM/CSS y respetar el contrato de IDs de `UI.ts`. Cualquier campo nuevo pasa por `HudViewData`, no por lectura directa de `Game`.

#### 2.8.4 Audio y *game feel*

- Usar `playQuotaWarning()` a 30, 15 y 5 s; hoy está implementado y sin llamada.
- Añadir un **cuerno lejano** de la tolva, con paneo y filtro de distancia; es la señal de “casa”.
- El impacto del pico ya tiene cuatro capas; las patentes cambian el tono, no solo el volumen.
- La superficie cambia de ambiente con la huella: viento, pájaros que desaparecen, maquinaria lejana, lluvia de ceniza.
- El *screenshake* debe tener un presupuesto (ver 3.5), no solo un valor.

#### 2.8.5 Criterio de aceptación

- [x] La superficie del día 15 se ve distinta de la del día 1 sin leer un número.
- [x] La liquidación explica cuota, capital, prima y huella en una sola pantalla.
- [x] El HUD separa cuota, carga y capital sin ambigüedad.
- [x] Los números grandes se leen y el modo exacto está disponible.
- [x] La huella no cuesta más de 1 ms de CPU al empezar el día.

---

### 2.9 Orientación 3D transversal

La orientación no es un motor de los siete, pero atraviesa el 2, el 3 y el 7. Sin ella, el 3D se convierte en un laberinto sin brújula.

| Herramienta | Qué resuelve | Cómo se obtiene | Coste técnico | Fase |
|---|---|---|---|---|
| **Reloj de retorno** | “¿Me da tiempo?” | Desde el inicio | Grafo local de pasabilidad + A* | 1 |
| **Rumbo a tolva** | “¿En qué dirección está casa?” | Desde el inicio | Brújula HUD + audio | 1 |
| **Plano de galerías** | “¿Dónde he estado?” | Certificación de misión | Canvas 2D desde carves; 2 Hz | 2–3 |
| **Balizas** | “¿Dónde está este túnel?” | Compra o certificación | Hasta 8 instancias + luz + HUD | 2 |
| **Sonda de vetas** | “¿Qué hay detrás de esta pared?” | Certificación de misión | Resaltado de proxies a través de 2 m | 3 |
| **Filtro de polvo** | “¿Por qué no veo?” | Certificación de misión | Linterna más ancha + partículas reducidas | 3 |
| **Audio direccional** | “¿De dónde viene?” | Desde el inicio | Panner + cues | 1 |

**Plano de galerías:** se dibuja en canvas a 128 × 128, con las celdas excavadas/visitadas, la tolva, el jugador y los módulos detectados. No es un minimapa del mundo completo: es un mapa de lo que el jugador ha abierto. Se actualiza a 2 Hz y se abre con `C`. En 3D, se acompaña de una **tira de profundidad** (una sección vertical simplificada) para que el jugador no confunda “norte” con “abajo”.

**Balizas:** se colocan con `Q`, máximo 8, con un color y una etiqueta breve. Emiten una luz pequeña y aparecen en el HUD como rumbos. Son locales para el jugador o compartidas por el equipo; la primera opción evita protocolo, la segunda mejora la coordinación. Recomendación: compartidas en Fase 2, con un mensaje ligero.

**Controles nuevos:** `C` mapa, `Q` baliza. No se pisan con WASD, `E`, `R`, `G`, `Tab`, `I`, `M`, `Espacio`, `Shift`, `1–9` ni rueda. La cabria y la tolva de campaña usan `E` contextual, como la tolva.

---

### 2.10 Matriz de sistemas propuestos

| Sistema | Motor | Fantasía | Problema 3D que resuelve | Anclaje de código | Fase |
|---|---|---|---|---|---|
| Cuota/Capital separados | 1 | Contrato frente a inversión | Lectura de profundidad y elección | `config.ts`, `Interaction.ts`, `DaySettlement.ts` | 1 |
| Ley de merma | 1 | Carbón profundo pobre en ley | Evita que el carbón profundo sea óptimo | `config.ts`, `Resources.ts` | 1 |
| Prima de puntualidad | 2 | Volver pronto paga | Premia la ruta eficiente | `DaySettlement.ts`, `Hud.ts` | 1 |
| Reloj de retorno | 2 | “…si me da tiempo” | Orientación y planificación | `Terrain`, nuevo `ReturnPlanner` | 1 |
| Rumbo a tolva | 2 | “Casa está allí” | Orientación | `Hud.ts`, `UI.ts` | 1 |
| Carga crítica/derrame | 2 | El peso se siente | Riesgo vertical | `Player.ts`, `Interaction.ts` | 2 |
| Tolva de campaña | 2–3 | Asegurar a mitad de túnel | Punto de acopio 3D | nuevo `FieldDepot.ts` | 2 |
| Cabria de contrapeso | 3 | Ruta vertical expresa | Transporte en Y | nuevo `Winch.ts` o `Ladders.ts` | 2 |
| Cinta de retorno | 3 | El pozo como fábrica | Transporte de fragmentos | nuevo `Conveyors.ts`, `Loot.ts` | 3–4 |
| Plataforma móvil | 3 | La base desciende | Omisión de capas | `DayCycle`, `Environment`, `Player` | 3–4 |
| Patentes | 4 | Saltos de poder | Escalado late | `config.ts`, `Combat.ts` | 3 |
| Pasivas cuadráticas | 4 | Cofres que importan | Escalado mid | `config.ts`, `Combat.ts` | 3 |
| Conversión de excedentes | 4 | Nada se desperdicia | Topes visibles | `config.ts`, UI | 3 |
| Cargas conformadas | 4 | Voladura dirigida | Volumen cúbico | `Combat.ts`, `Effects.ts` | 3 |
| Actas de operación | 5 | Identidad de build | Prohibiciones con espacio | `config.ts`, `Shop`, save/protocol | 3 |
| Topologías | 5 | Minas distintas | Orientación y rutas | `Terrain`, `Resources`, snapshot | 3–4 |
| Cláusulas | 5 | La junta aprieta | Modificadores de partida | `config.ts`, `DayCycle` | 3 |
| Encargos de galería | 6 | Misiones con espacio | Objetivos físicos 3D | nuevo `Missions.ts`, `ServiceModules.ts` | 3 |
| Certificaciones | 6 | Utilidad no comprable | Elección de build | `types.ts`, save/protocol, UI | 3 |
| Huella de superficie | 7 | El coste visible | Feedback del crecimiento | `Environment`, `Landscape` | 1/4 |
| Acta de extracción | 7 | Contabilidad narrativa | Cierre legible | `DaySettlement`, `UI` | 1 |
| Libro Mayor | 4/7 | Números grandes | Legibilidad | `format.ts`, nuevo `BigValue.ts` | 4 |
| Brigadas | 3/4 | Escala industrial | Pathfinding masivo | `Staff.ts`, `Avatars.ts`, save/protocol | 4 |
| Presupuesto sensorial | 3/4 | Legibilidad | Partículas/audio/shake | `Effects.ts`, `Audio.ts`, `Player.ts` | 4 |

## 3. Arquitectura técnica y prevención de cuellos de botella en 3D

### 3.1 Principio general: presupuesto antes que contenido

El error típico de un incremental 3D es añadir entidades y efectos hasta que el frame se rompe, y después intentar optimizar. Aquí se invierte el orden: **cada sistema declara un presupuesto y degrada antes de fallar**. El juego debe seguir siendo legible a 60 fps en un equipo modesto, aunque el jugador tenga números absurdos.

Presupuesto objetivo de frame a 60 fps (16,6 ms):

| Subsistema | Presupuesto CPU | Degradación |
|---|---:|---|
| Render | 8,0 ms | Resolución, sombras, luces |
| Terreno / reconstrucción | 2,5 ms | Menos chunks por frame, LOD |
| Loot | 1,5 ms | Fusión, menos física, modo granel |
| Plantilla | 1,5 ms | LOD, simulación estadística |
| Efectos / partículas | 1,0 ms | Presupuesto sensorial |
| Audio | 0,5 ms | Voces, throttle, ducking |
| UI / DOM | 0,8 ms | Actualización por firma, no por frame |
| Margen | 0,8 ms | Reserva para picos |

No es una suma exacta de un perfil real; es una **guía de reparto** para decidir qué se degrada primero. El primer perfil real debe hacerse en la Fase 1, no en la Fase 4.

---

### 3.2 Loot: de 6.000 fragmentos a un sistema con presupuesto

#### 3.2.1 Estado actual y problemas

- `MAX_PELLETS = 6000` (`src/config.ts:21`).
- `LootField.update()` recorre las 6.000 entradas en cada paso fijo y actualiza matriz y atributos de brillo (`src/world/Loot.ts:416-524`).
- `LootField.collectNearestWithin()` y `getNearestPellet()` recorren las 6.000 entradas por consulta (`src/world/Loot.ts:576-600`, `:622-660`). Con 6 recolectores a 5 Hz son ~180.000 comprobaciones/s; con brigadas, inasumible.
- `findSlot()` recorre hasta 6.000 posiciones y, si no hay ninguna libre, **reutiliza la posición del cursor y sobrescribe un pellet activo** (`src/world/Loot.ts:403-414`). Eso pierde el yield de la pieza sobrescrita sin avisar. Es un bug de escala, no solo de rendimiento.
- Cada pellet actualiza `instanceMatrix`, `instanceEmissive`, posición de glow y color de glow; a 6.000 activos, el ancho de banda de atributos es alto.

#### 3.2.2 Presupuesto de loot

| Recurso | Límite | Comportamiento al llegar |
|---|---:|---|
| Pellets físicos activos | 1.500 | Se fusionan o se derivan al libro de exceso |
| Pellets visibles | 1.500 | Los lejanos se congelan y no actualizan matriz |
| Montones fusionados | 400 | Se representan como una instancia escalada |
| Actualización física | 60 Hz cerca; 10 Hz medio; 0 lejos | LOD por distancia |
| Consultas de recogida | Spatial hash 2 m | No se recorre el array completo |
| Yield virtual | Sin límite | Se acumula en un libro de exceso y se cobra al recoger |

#### 3.2.3 Fusión dinámica

Algoritmo propuesto:

```text
cada 0,5 s, o si activos > 1.200:
  para cada pellet activo dentro del radio de fusión:
    celda = hash2D(pellet.x, pellet.z)
    para cada celda vecina:
      si mismo mineral y distancia < 1,5 m:
        sumar carbon, money, weight y count en A
        desactivar B
        escalar A por cbrt(weightTotal / weightUnitario)
```

Reglas:

- La fusión **conserva el yield total**; no se redondea a la baja.
- El tamaño visual máximo de un montón es 2,2× el pellet base; si se supera, se crea otro montón.
- La fusión es local (el loot no se replica), así que puede variar entre clientes sin afectar al depósito agregado.
- Los montones fusionados se pueden recoger igual que un pellet; el `CollectedLoot.lines` conserva la composición por mineral.
- No se fusionan minerales distintos, para que el color y el valor sigan siendo legibles.

#### 3.2.4 Libro de exceso

Cuando no hay slot libre:

- No se sobrescribe nada.
- Se crea una entrada en un `overflowLedger` por mineral y posición aproximada.
- El jugador o un recolector que se acerque recibe el yield directamente, con un efecto visual de “montón” estático.
- Si el jugador se aleja y el libro crece, se consolida en un **montón de campaña** visible; nunca se pierde.
- Al cerrar el día, el libro se vacía con el mismo criterio que la mochila (se pierde la carga no asegurada), pero el jugador pudo haberlo recogido.

#### 3.2.5 Modo granel

Desbloqueo de late game (certificación o patente):

- Al romper un nodo, una fracción o la totalidad del yield se acredita directamente a la mochila virtual, sin crear 7–10 pellets físicos.
- Se muestra un **chorro de mineral** y un texto flotante; el jugador sigue viendo el resultado, pero no hay 6.000 entidades.
- El modo se puede activar/desactivar en la oficina para quien quiera el *game feel* completo.
- No se aplica a minerales de misión ni a cofres; esos conservan su objeto físico.

#### 3.2.6 Consultas espaciales

- Sustituir los recorridos lineales por un **spatial hash** de celdas de 2 m, reconstruido cada 0,5 s o actualizado al mover/crear un pellet.
- `getNearestPellet(position, radius, remainingWeight)` consulta solo las celdas del radio, ordenadas por distancia.
- `collectNearestWithin` usa el mismo índice.
- Los recolectores solo consultan el índice cuando su temporizador de retarget lo pide; no cada frame.

#### 3.2.7 Criterio de aceptación

- [x] El juego mantiene 60 fps con 1.500 pellets activos en un equipo de gama media.
- [x] Ningún pellet activo se sobrescribe al llegar al tope.
- [x] La fusión conserva el 100 % del yield.
- [x] Una consulta de recolector no recorre 6.000 entradas.
- [x] El modo granel es opcional y no rompe la lectura del mineral.

---

### 3.3 Plantilla: simulación híbrida y brigadas

#### 3.3.1 Estado actual

- Máximo 6 empleados individuales (`MAX_EMPLOYEES = 6`).
- `StaffManager` actualiza todos los registros cada paso fijo.
- `findClosestNode()` recorre `resources.nodes` (≈7.800) para cada minero que busca objetivo (`src/entities/Staff.ts:416-422`).
- Los recolectores vuelan en línea recta y consultan el loot; no hay navmesh ni grafo de pasabilidad.
- El host simula; los clientes reciben estados a 5 Hz (`STAFF_NET_INTERVAL = 0.2`).
- `StaffAvatars` oculta el rig si el cuerpo entra en roca, pero no resuelve la navegación.

#### 3.3.2 Dos capas: supervisores y brigadas

| Capa | Cantidad | Simulación | Representación | Persistencia |
|---|---:|---|---|---|
| **Supervisores** | Hasta 6 | Individual, cinemática, cápsula, objetivo, ataque | Rig completo, nombre, rango | `EmployeeRecord` actual |
| **Brigadas** | Hasta 4 sectores | Estadística, sin agentes individuales | 1 capataz + siluetas instanciadas | Nuevo `BrigadeRecord` |

Los supervisores conservan la invariante actual: cada contrato es un registro con `id`, `kind`, `rank`. Las brigadas son **contratos de cuadrilla**, no contadores globales: cada una tiene `id`, `sectorId`, `headcount`, `kind`, `rank` y `seed`. Se guardan y se replican.

#### 3.3.3 LOD de simulación

| Distancia / visibilidad | Nivel | Qué se simula |
|---|---|---|
| ≤40 m y en pantalla | **Cerca** | Movimiento, cápsula, terreno, objetivo, ataque, animación |
| 40–100 m o fuera de pantalla | **Medio** | Movimiento simplificado en rejilla de 2 m; sin cápsula individual; sin animación |
| >100 m o sector no visible | **Lejos** | Rendimiento estadístico por segundo; sin entidades |
| Brigada sin sector | **Estadística** | No se renderiza; aporta yield al host si tiene sector asignado |

El límite de agentes visibles recomendado es **24 rigs completos** y **64 siluetas simplificadas**. Por encima, se agrupan. El jugador nunca necesita ver 1.000 empleados para creer que tiene 1.000; necesita ver **la escala** (una multitud instanciada, una cinta llena, un montón de estéril).

#### 3.3.4 Sectores de extracción

- El jugador coloca una **baliza de sector** en el pozo (máximo 4 activas).
- La baliza define un volumen de 12 × 12 × 12 m o un radio de 8 m, validado por el host contra la densidad.
- Una brigada asignada a un sector extrae estadísticamente: cada segundo, el host calcula `yield = headcount × tasaBase × multiplicadorRango × factorCapa × densidadMineral × ruidoDeterminista`.
- El yield se aplica al libro del día y se muestra como un flujo de fragmentos hacia la tolva o como un montón que crece.
- Los supervisores pueden trabajar dentro de un sector para dar bonus de coordinación; no son necesarios.

Esto es simulación híbrida real: **los agentes cercanos se mueven; los lejanos se contabilizan**.

#### 3.3.5 Navegación 3D

- **Supervisores mineros:** movimiento hacia el objetivo con comprobación de cápsula y ajuste al suelo; si el objetivo está en roca, excavan un túnel corto. Es la IA actual, mejorada con un grafo local de pasabilidad para no abrir túneles absurdos.
- **Supervisores recolectores:** vuelo con *sphere-cast* contra densidad; waypoint en la boca del pozo; no atraviesan la plataforma.
- **Brigadas:** no navegan. Usan el sector. Es la única forma de escalar sin un navmesh 3D destructible.
- **Grafo local:** rejilla de 2 m alrededor del jugador/sector, reconstruida al cambiar los carves; A* de corto alcance para los supervisores. No se recalcula el mundo entero.

#### 3.3.6 Red y guardado

- `staff` (5 Hz) sigue para supervisores.
- Nuevo `brigade_state` (2 Hz) con `id`, `sectorId`, `headcount`, `kind`, `rank`, `active`.
- El snapshot incluye sectores y brigadas; un late join no necesita el historial de cada trabajador, solo el estado agregado y la economía compartida.
- Guardado v8: `brigades`, `sectors`, `nextBrigadeId`; migración desde v7/v6/v5. Los supervisores actuales se conservan.
- El host es el único que simula brigadas y concede yield; los clientes solo interpolan lo visible.

#### 3.3.7 Criterio de aceptación

- [x] 6 supervisores + 4 brigadas no bajan de 60 fps en el equipo objetivo.
- [x] El host puede simular 10.000 trabajadores estadísticos sin crear 10.000 entidades.
- [x] Cada brigada es un registro con id, no un contador global.
- [x] El late join recibe sectores y brigadas sin reiniciar el día.
- [x] La representación visual de una brigada se lee como multitud, no como un solo muñeco.

---

### 3.4 Terreno: carves por lotes y reconstrucción presupuestada

#### 3.4.1 Estado actual y problemas

- Rejilla de 49 × 129 × 49 = **309.729 muestras** (`src/world/Terrain.ts:18-30`).
- 4 × 16 × 4 = **256 chunks**.
- `Terrain.carve()` recorre el volumen de la esfera y, al final, llama a `countSolids()`, que recorre **toda la rejilla** (`src/world/Terrain.ts:277-338`, `:193-201`). Con 14 carves/s son ~4,3 millones de comprobaciones/s solo para contar sólidos; con explosiones y brigadas, el coste se dispara.
- `rebuildDirty(5)` se llama en cada carve y `update()` reconstruye hasta 4 chunks por frame (`src/world/Terrain.ts:347-373`).
- Cada `CarveEvent` es una esfera; no hay formas compuestas ni fusión de eventos.
- El historial de red se limita a 4.000 eventos; un día con 4 jugadores, staff y explosiones puede superarlo.

#### 3.4.2 Lotes de excavación

En cada paso fijo:

1. Recoger los eventos de carve del tick (jugador, staff, granadas).
2. Agruparlos por conjunto de chunks afectados.
3. Aplicar la unión de esferas/cápsulas sin reconstruir.
4. Actualizar `solidCount` de forma incremental: contar solo las celdas que cambian de sólido a aire o viceversa.
5. Marcar los chunks sucios una sola vez.
6. Reconstruir con presupuesto (4 chunks/frame; 2 si el frame anterior fue lento).

La unión de esferas no cambia la autoridad: el host sigue registrando la secuencia de eventos; el lote es una optimización de aplicación/render. Si la secuencia debe ser determinista, se conserva el orden de los eventos y se aplica cada uno; lo que se evita es reconstruir la malla entre ellos.

#### 3.4.3 Formas de excavación

Añadir un `CarveShape`:

| Forma | Uso | Volumen | Ventaja |
|---|---|---|---|
| Esfera | Pico, granada básica | `4/3 π r³` | Simple, predecible |
| Cápsula | Taladro, carga conformada | `π r² L + 4/3 π r³` | Túnel recto y controlado |
| Cono | Granada de embudo | `1/3 π r² h` | Abre una rampa o embudo |
| Caja redondeada | Módulo de servicio, sala | `w × h × d` con caída | Salas legibles, menos triángulos |

El `CarveEvent` actual `{x,y,z,r,s}` tendría que crecer a `{shape, x,y,z,r,s,dirX,dirY,dirZ,length}`. Es un cambio de protocolo; la compatibilidad se corta con la versión.

#### 3.4.4 Presupuesto de reconstrucción

- Prioridad: chunks en pantalla y cerca del jugador primero; chunks detrás o a >80 m después.
- LOD: malla completa hasta 64 m; malla simplificada o culling hasta 96 m; niebla a partir de 80 m.
- No reconstruir chunks sin cambios visibles; no reconstruir si el jugador está en la oficina/menú.
- Si el presupuesto se agota, los chunks pendientes se reconstruyen en el siguiente frame; el jugador puede ver un pequeño retraso visual, nunca un bloqueo.
- Medir `renderer.info.render.triangles` y `renderer.info.memory.geometries` al cambiar de día; una fuga de geometrías es un fallo de aceptación.

#### 3.4.5 Historial y late join

- Cuantizar coordenadas y radios a 1 byte por eje/valor; 5–8 bytes por evento.
- Agrupar carves de staff en “**actas de excavación**” por chunk y segundo; el late join recibe el acta comprimida, no cada golpe.
- Subir el límite a 8.000 eventos o a un presupuesto de 96 KiB; si se supera, consolidar los más antiguos por chunk.
- El snapshot sigue limitado a 512 KiB; medir el tamaño real con 4 jugadores y un día intenso.
- **Nunca enviar mallas**; el acta es una lista de operaciones, no geometría.

#### 3.4.6 Criterio de aceptación

- [x] Un carve normal no recorre 309.729 celdas para contar sólidos.
- [x] 20 carves en un tick se agrupan y reconstruyen sin pico de frame.
- [x] La malla de un chunk no se reconstruye dos veces en el mismo tick.
- [x] El late join con 8.000 eventos entra en 512 KiB.
- [x] Cambiar de día 10 veces no incrementa de forma sostenida las geometrías en memoria.

---

### 3.5 Presentación: partículas, luces, audio y *screenshake*

#### 3.5.1 Estado actual

- `MAX_SPARKS = 900`, `MAX_DEBRIS = 220`, `ARC_POOL_SIZE = 12` (`src/core/Effects.ts:5-6`, `:239-269`).
- Hasta 12 luces de explosión en la escena, más la luz de impacto (`src/core/Effects.ts:265-269`).
- La linterna del jugador es un `SpotLight`; la oficina y la tolva añaden luces; el viewmodel tiene su propia escena y luces (`src/player/Player.ts:95-105`, `src/world/Environment.ts:463-465`, `src/player/ToolView.ts:117-125`).
- El *screenshake* se aplica en `Player.updateCamera()` con `Math.random()` y no tiene un presupuesto global (`src/player/Player.ts:768-789`).
- No se ha identificado un límite explícito de voces en el código visible; los one-shots se crean y se destruyen, pero una ráfaga de impactos puede saturar.

#### 3.5.2 Presupuesto sensorial

Un objeto `PresentationBudget` con tokens por frame:

| Evento | Coste | Degradación |
|---|---:|---|
| Chispa | 1 | Menos cantidad, menos vida |
| Escombro | 2 | Se convierte en chispa o se omite |
| Luz dinámica | 8 | Compartir luz o usar emisivo |
| Sonido posicional | 3 | Throttle, menor volumen, ducking |
| *Screenshake* | 4 | Reducir amplitud, no duración |

Presupuesto sugerido: **120 tokens/frame** en condiciones normales; 60 en una explosión masiva; 0 para eventos a >60 m. La importancia del evento (distancia, si está en pantalla, si es del jugador) multiplica el coste.

#### 3.5.3 Luces

- Máximo **2 luces de explosión activas** a la vez; las demás usan un *flash* emisivo sin luz.
- La linterna del jugador y la luz de impacto son fijas; la oficina/tolva solo se encienden si el jugador está cerca.
- Las vetas usan emisivo y `Points`, no luces dinámicas; ya es así y debe mantenerse.
- En el viewmodel, las luces son locales a su escena y no cuentan para el presupuesto del mundo, pero sí para el coste de draw calls.

#### 3.5.4 Audio

- Máximo **24 voces** simultáneas, **12 posicionales**.
- Throttle de impactos: no más de un sonido de pico cada 30 ms; las recogidas usan la ventana de ráfaga existente.
- *Ducking* del ambiente cuando hay una explosión o un aviso de cuota.
- El aviso de cuota (`playQuotaWarning`) debe usarse a 30/15/5 s; la auditoría ya lo marca como no invocado.
- Si el jugador está sordo o ha silenciado, el aviso debe ser también visual (banner + flash de HUD).

#### 3.5.5 *Screenshake*

- Sistema de *trauma*: `trauma` 0–1, decaimiento 2,5/s, amplitud `trauma²`.
- Tope de minería 0,2; explosión cercana 0,6; explosión masiva 0,8; nunca 1,0 salvo evento narrativo.
- No aplicar shake a eventos a >40 m; no acumular más de 0,8.
- Opción de accesibilidad: 0 %, 50 %, 100 %; por defecto 100 %, pero recordada.
- El shake no debe mover la posición del jugador, solo la cámara; no debe afectar al apuntado autoritativo.

#### 3.5.6 Criterio de aceptación

- [x] Una explosión masiva no baja de 45 fps en el equipo objetivo.
- [x] Nunca hay más de 2 luces de explosión activas.
- [x] El shake no supera el tope y se puede desactivar.
- [x] El aviso de cuota se oye y se ve.
- [x] El audio no satura con 20 impactos en 1 s.

---

### 3.6 Números grandes y economía determinista

#### 3.6.1 El problema

`formatMoney()` usa `Intl.NumberFormat` con separadores completos. `RunSnapshot.money` y `quota` son `number`. Mientras el juego se quede en 40.000, no hay problema. En el modo infinito, con cuotas ×1,55 y precios de patentes, se puede superar `Number.MAX_SAFE_INTEGER` (9,007 × 10¹⁵) si el diseño llega lejos. Ahí aparecen los errores de redondeo y la UI ilegible.

#### 3.6.2 `BigValue`

Nuevo módulo `src/core/BigValue.ts`:

```ts
interface BigValue {
  mantissa: number; // 1 <= |m| < 10
  exponent: number; // entero
}
```

Operaciones mínimas: `fromNumber`, `add`, `sub`, `mul`, `div`, `cmp`, `clampMin`, `formatShort`, `formatExact`, `toWire`, `fromWire`.

- Solo se usa para **cuota, capital, precios, stats y bonus**; nunca para posiciones, daños por frame, tiempos ni radios.
- Se normaliza después de cada operación para evitar `mantissa` fuera de rango.
- `toWire` serializa como `"m e"` o `"1.23e9"`; el parser valida el formato y los límites.
- El guardado guarda strings, no objetos, para no romper JSON.
- Migración: los valores actuales se convierten desde `number` al cargar v5.

#### 3.6.3 Formato español

| Rango | Formato corto | Ejemplo | Formato exacto |
|---|---|---|---|
| < 10.000 | entero con puntos | `9.999 t` | `9.999 t` |
| 10.000–999.999 | `k` con 2 decimales | `12,50 k t` | `12.500 t` |
| 1e6–1e9 | `M` con 2 decimales | `1,25 M t` | `1.250.000 t` |
| 1e9–1e12 | `MM` con 2 decimales | `3,40 MM t` | `3.400.000.000 t` |
| ≥1e12 | científica | `1,23×10¹² t` | `1.230.000.000.000 t` |

`MM` se define explícitamente en la UI como “miles de millones” para evitar la ambigüedad del inglés; si se prefiere, usar solo científica desde 1e9. El modo Libro Mayor muestra siempre la versión exacta y la corta entre paréntesis.

#### 3.6.4 Precisión y redondeo

- El estado interno no se redondea al mostrar.
- La liquidación usa la misma representación que el depósito; no se recalcula con `number`.
- Los depósitos del cliente se validan contra un máximo teórico y se convierten a `BigValue` en el host.
- Los tests deben cubrir `1e15 + 1`, `1e15 × 2`, comparación y serialización.

#### 3.6.5 Criterio de aceptación

- [x] El juego puede mostrar `10¹⁸` sin perder precisión.
- [x] El snapshot y el guardado aceptan valores grandes como strings.
- [x] La UI corta y la exacta coinciden.
- [x] La migración de guardado v5 → v8 no pierde dinero ni cuota.
- [x] Los cálculos de posiciones siguen en `number`.

---

### 3.7 Red, snapshots y determinismo

#### 3.7.1 Contrato actual

- `PROTOCOL_VERSION = 11`, prefijo `carbon-magnate-v11-` (`src/network/Protocol.ts:26`, `src/config.ts:68`).
- Mensajes de cliente: `hello`, `state`, `carve`, `node_hit`, `node_break`, `deposit`, `grenade_use`, `ladder_place`, `fx`, `purchase`.
- Mensajes de host: `welcome`, `roster`, `start_day`, `sync`, `players`, `staff`, `ladder_placed`, `carve`, `node_hit`, `node_break`, `economy`, `fx`, `day_result`, `shop_state`, `passive`, `game_over`, `error`, `disconnect`.
- Snapshot máximo 512 KiB; historial de carves 4.000.
- El host es autoritativo para semilla, cuota, reloj, fin de día, compras, cofres y plantilla.

#### 3.7.2 Cambios por fase

| Fase | Cambio de protocolo | Nuevos campos/mensajes | Versión |
|---|---|---|---|
| 1 | Prima, canje y ley de carbón | `day_result.report` ampliado; sin mensajes nuevos | v11 se mantiene si solo cambia el cálculo; si cambia el DTO, v12 |
| 2 | Cabria, tolva de campaña, mapa/balizas compartidas | `winch_place`/`winch_placed`, `depot_place`/`depot_state`, `beacon_state` | v12 |
| 3 | Actas, cláusulas, misiones, certificaciones, topologías | `doctrine`, `clauses`, `mission_state`, `mission_complete`, `certification`, `platformDepth` | v13 |
| 4 | Brigadas, cintas, números grandes | `brigade_state`, `sector_place`, `belt_place`/`belt_state`; valores como strings | v14 |

Si la Fase 1 termina cambiando la forma de `day_result.report`, todas las versiones siguientes se desplazan una (v12→v13→v14→v15). Cada cambio de forma de mensaje o de generación compartida exige subir `PROTOCOL_VERSION` **y** `PEER_ID_PREFIX` a la vez. No se mantiene compatibilidad entre versiones.

#### 3.7.3 Orden de generación con módulos y plataforma

```text
1. Semilla del día (host)
2. Terreno base con platformDepth / relleno de estéril
3. Módulos de servicio (metadatos y volúmenes excluidos)
4. Recursos (vetas y cofres, evitando módulos)
5. Historial de carves
6. Nodos rotos / hp
7. Estado de misiones, certificaciones y brigadas
```

El orden 1–6 es un invariante de determinismo. Cambiarlo exige una revisión de `world-determinism` y una versión nueva. Los módulos no son carves de jugador; son generación base y no deben entrar en el historial.

#### 3.7.4 Autoridad de los sistemas nuevos

| Sistema | Autoridad | Cliente | Snapshot |
|---|---|---|---|
| Módulos de misión | Host genera y valida | Ve, interactúa, envía `mission_complete` | Lista y estado |
| Certificaciones | Host concede | Muestra y equipa | `certifications` |
| Actas/cláusulas | Host elige al inicio | Muestra | `doctrine`, `clauses` |
| Cabria/tolva/cinta | Host valida colocación y stock | Predice colocación, envía evento | Lista y stock |
| Brigadas | Host simula | Interpola lo visible | `brigade_state` |
| Plataforma móvil | Host decide el cierre | Reconstruye con `platformDepth` | `platformDepth` |
| Números grandes | Host calcula | Muestra | Strings |

#### 3.7.5 Late join

- El snapshot debe incluir: módulos, misiones completadas, certificaciones, doctrina, cláusulas, plataforma, cabrias, tolvas de campaña, cintas, brigadas y sectores.
- No se envía el historial de cada trabajador ni de cada pellet.
- El late join reconstruye el terreno con el orden anterior y recibe la economía compartida.
- Si el snapshot supera 512 KiB, se recortan primero los carves más antiguos por chunk, nunca el estado de misión/economía.

#### 3.7.6 Criterio de aceptación

- [x] Dos clientes de la misma versión ven el mismo terreno, módulos, misiones y certificaciones.
- [x] Un late join termina de cargar en <5 s en una conexión normal.
- [x] El host sigue siendo el único que concede cuota, capital y certificaciones.
- [x] Ningún mensaje nuevo envía mallas ni posiciones de fragmentos.
- [x] El snapshot no supera 512 KiB en un día de 4 jugadores.

---

### 3.8 Matriz de riesgos técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El rebalanceo de carbón rompe las cuotas 5–15 | Media | Alto | Simulación con la tabla actual; mantener días 1–5; ajustar bonus/cuota, no reañadir capital al carbón |
| La fusión de loot cambia la sensación de recoger | Media | Medio | Modo granel opcional; conservar un mínimo de pellets visibles; playtest |
| El pathfinding 3D se come la CPU | Alta | Alto | Sectores + LOD; A* local; brigadas estadísticas |
| La plataforma móvil rompe spawn, oficina, tolva y red | Alta | Alto | Prototipo aislado; si no es estable, usar tiro de servicio |
| Los módulos de misión desincronizan IDs | Media | Alto | Generar antes de recursos; versión nueva; tests de determinismo |
| Las actas rompen el cooperativo | Media | Alto | Doctrina de equipo; validación en host; una sola regla compartida |
| Los números grandes pierden precisión | Media | Alto | `BigValue`; strings en JSON; tests de límites |
| Las luces/partículas bajan los fps | Alta | Medio | Presupuesto sensorial; límites duros; perfilado en GPU integrada |
| El historial de carves supera el snapshot | Media | Medio | Compresión por chunk; límite; pruebas de late join |
| La UI de orientación tapa la acción | Media | Bajo | Cinta discreta; mapa a demanda; opción de ocultar |
| El jugador se siente castigado por el derrame | Baja | Medio | Derrame recuperable; solo en caídas duras; aviso claro |
| La superficie degradada cuesta más que un cambio de textura | Baja | Medio | Etapas al empezar el día; instancias; sin física |

### 3.9 Reglas de oro técnicas

1. **Nada de entidades sin presupuesto.** Cada sistema nuevo declara su cap y su degradación.
2. **Nada de `Math.random()` en generación.** Solo efectos visuales locales.
3. **Nada de mallas por red.** IDs, eventos, estados y agregados.
4. **Nada de topes silenciosos.** Todo tope tiene UI y conversión.
5. **Nada de números grandes en `number` si superan 2⁵³.**
6. **Nada de lógica autoritativa en el cliente.**
7. **Nada de teleport con carga** salvo una utilidad de emergencia, consumible y validada por el host.
8. **Nada de contadores globales de empleados.** Brigadas con id, sector y headcount.
9. **Nada de arte/audio externo.** Todo procedural.
10. **Nada de optimizar antes de medir**, pero medir desde la Fase 1 con un perfil reproducible.

## 4. Plan de actuación y roadmap

### 4.0 Criterios de éxito del plan

El plan no se mide por “features añadidas”, sino por decisiones que el jugador puede tomar y por el coste de sostenerlas.

| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Comprensión del Día 1 | ≥80 % de playtesters explica cuota vs capital | Entrevista de 60 s tras la primera partida |
| Viajes por día | 1–2 en Días 1–5; 2–3 en Días 10–15 | Instrumentación local de depósitos |
| Error del reloj de retorno | ≤20 % sobre el tiempo real | Comparar estimación vs llegada |
| Mejoras desperdiciadas | 0 | Test de topes y conversión |
| Dispersión de actas | ≤10 puntos de win rate en Día 15 | Simulación + playtest |
| Participación en encargos | 25–40 % de los días | Estado de misión |
| Rendimiento | 60 fps a 1080p en equipo objetivo; 1 % low ≥45 | Perfil de Chrome/Electron |
| Late join | <5 s hasta jugar | Prueba de dos ventanas |
| Memoria | Sin crecimiento sostenido en 10 días | `renderer.info.memory` |
| Migración de guardado | 100 % de v5 → v8 sin pérdida | Tests de migración |

No hay telemetría externa. La instrumentación debe ser local y eliminable: un overlay de desarrollo, un harness de CDP o una hoja de simulación. No se añaden servicios de terceros sin aprobación.

---

### 4.1 Fase 1 — Core Loop 3D y tensión de cuota (MVP)

**Objetivo:** que el jugador entienda en el primer minuto que el carbón paga la cuota y el mineral paga la oficina, y que volver a la tolva sea una decisión informada, no un trámite a ciegas.

**Duración orientativa:** 2–3 semanas de una persona, incluyendo tests y playtest. No incluye arte nuevo.

#### Diseño

- [x] Escribir la definición canónica de **Cuota de carbono**, **Capital de reposición** y **Carga no asegurada**; usarla en HUD, tienda, liquidación y onboarding.
- [x] Aprobar la tabla objetivo de carbón por capa (8 / 14 / 20 / 30) y la regla “ningún carbón supera a un mineral en $/HP”.
- [x] Definir la **prima de puntualidad** y el **canje de excedente**; decidir si el fondo de reserva queda para Fase 3.
- [x] Escribir el guion de onboarding del Día 1: tres carteles, dos toasts y un objetivo contextual.
- [x] Diseñar el **reloj de retorno** en su versión heurística (distancia + desnivel + escaleras), sin A* completo.
- [x] Diseñar la jerarquía del HUD: cuota, carga, capital, retorno, profundidad, capa.
- [x] Definir el **Acta de extracción** de la liquidación: cuota, tiempo en cubrirla, capital, prima, canje, bonus y huella.

#### Código

- [x] `src/config.ts`: fijar `carbonYield` y `moneyYield` de los cuatro carbones; añadir constantes de prima y canje.
- [x] `src/types.ts`: ampliar `DayReport` con `punctuality`, `surplusCarbon`, `surplusCapital`, `securedAt` y `surfaceStage` (si se calcula).
- [x] `src/core/DaySettlement.ts`: calcular prima, canje y rendimiento sin reañadir capital al carbón.
- [x] `src/core/Interaction.ts`: verificar que el depósito de carbón no suma capital; conservar la composición `lines`.
- [x] `src/core/Hud.ts` y `src/ui/UI.ts`: separar cuota/carga/capital; añadir rumbo y reloj de retorno; actualizar la firma del HUD.
- [x] `src/core/Game.ts` / `src/player/Player.ts`: exponer la posición, la carga y el estado de escalera que necesita el reloj de retorno; no duplicar estado.
- [x] Nuevo `src/core/ReturnPlanner.ts`: heurística de retorno, cacheada, sin red.
- [x] `src/core/Audio.ts` / `Game.ts`: invocar `playQuotaWarning()` a 30/15/5 s; resolver el aviso de la auditoría.
- [x] `src/ui/format.ts`: añadir formato corto `k/M` y notación científica básica; dejar `BigValue` para Fase 4.
- [x] Añadir Vitest y los primeros tests: minerales, cuota, depósito, liquidación, formato y `ReturnPlanner`.
- [x] Añadir un job de CI que ejecute `npm ci`, `npm run typecheck`, `npm run build:web` y `npm test`; documentar el comando de un solo test.
- [x] Perfilar el estado actual con el harness local: frame time, draw calls, triángulos, memoria al cambiar de día.

#### UI

- [x] Rehacer el bloque superior del HUD: `CUOTA`, `CARGA`, `CAPITAL` con iconos y colores distintos.
- [x] Añadir el reloj de retorno junto al temporizador, con estados verde/ámbar/rojo.
- [x] Añadir la cinta de rumbo y la diferencia vertical; sin mapa todavía.
- [x] Actualizar el panel de apuntado: `LEY` del carbón y valor de capital del mineral.
- [x] Actualizar la tienda: “capital”, “próxima cuota”, “canje de excedente”.
- [x] Actualizar la liquidación con el Acta de extracción y la huella.
- [x] Añadir toasts de onboarding y un cartel de “CARBÓN = CUOTA / MINERAL = CAPITAL” en la zona segura.
- [x] Revisar 1280×720 y 960×540; el HUD no debe tapar el viewmodel ni el prompt.

#### Balance

- [x] Simular los Días 1–15 con la tabla actual y la nueva ley de carbón; medir cuota, viajes, capital/min y tiempo de retorno.
- [x] Ajustar la prima y el canje para que el Día 1 no sea trivial ni el Día 15 imposible.
- [x] Verificar que el carbón profundo no es la mejor fuente de capital.
- [x] Verificar que el mineral profundo sigue justificando el descenso.
- [x] Documentar las suposiciones y los valores antes/después en `plan.md`.

#### QA y aceptación

- [x] `npm run typecheck` y `npm run build:web` limpios.
- [x] `npm test` con los tests nuevos en verde.
- [x] Flujo manual: menú → día → picar carbón → picar mineral → recoger → volver → depositar → liquidación → tienda → día 2.
- [x] Verificar que recoger no acredita y que depositar carbón no paga capital.
- [x] Cooperativo a dos ventanas: depósito, economía y liquidación coinciden.
- [x] Late join: el cliente recibe la cuota, el capital y el estado del día.
- [ ] Playtest de 5 personas: ≥4 explican la diferencia cuota/capital.
- [x] Ningún aviso de auditoría nuevo.

**Criterio de salida:** el bucle se entiende, la doble divisa se siente y el jugador puede planificar el regreso. Sin esto, no se pasa a Fase 2.

---

### 4.2 Fase 2 — Movilidad 3D, logística y eliminación de fricción

**Objetivo:** convertir el viaje vertical en una ruta que se planifica, se construye y se mejora; hacer que la orientación sea una herramienta, no una memoria.

**Duración orientativa:** 3–4 semanas.

#### Diseño

- [x] Definir la escalera de movilidad: arnés de rappel, cabria, jetpack, tolva de campaña, cinta, plataforma móvil.
- [x] Decidir si la Fase 2 usa **tiro de servicio** (bajo riesgo) o **plataforma móvil** (alto riesgo); la plataforma puede esperar.
- [x] Definir el coste, stock y anclaje de la cabria; no debe convertir el pozo en un ascensor gratuito.
- [x] Definir la tolva de campaña: capacidad, colocación, retirada, red.
- [x] Definir la carga crítica y el derrame; sin salud de jugador.
- [x] Diseñar el plano de galerías (canvas 2D + tira de profundidad), las balizas y sus controles.
- [x] Definir el grafo de retorno de Fase 2 (A* local) y su presupuesto.
- [x] Actualizar la tabla de controles en README y en la UI.

#### Código

- [x] Nuevo `src/world/Winch.ts` (o extensión de `Ladders.ts`): anclaje, línea despejada, stock, ascenso, replicación.
- [x] Nuevo `src/world/FieldDepot.ts`: colocación, almacenamiento, retirada, transferencia, red.
- [x] Nuevo `src/core/ReturnPlanner.ts` completo: grafo de 2 m, A* local, cache, fallback.
- [x] Nuevo `src/ui/GalleryMap.ts`: canvas 128×128, celdas visitadas, tolva, módulos, profundidad.
- [x] Nuevo `src/world/Beacons.ts` o integración en `Environment`: hasta 8 balizas, luz y rumbo.
- [x] `src/player/Player.ts`: penalización por carga crítica y derrame recuperable en caída.
- [x] `src/world/Terrain.ts`: consultas de pasabilidad reutilizables por el planner; no duplicar densidad.
- [x] `src/core/Protocol.ts` v12 + prefijo: `winch_place`, `depot_place`, `beacon_state`; snapshot ampliado.
- [x] `src/save/SaveManager.ts` v6: stock de cabrias, tolvas de campaña y estado necesario; migración v5.
- [x] Tests: anclaje de cabria, línea bloqueada, depósito de campaña, planner, derrame, snapshot.
- [x] Perfilar el planner y el mapa; deben costar <1 ms/frame en el peor caso.

#### UI

- [x] Brújula con rumbo a tolva + diferencia vertical.
- [x] Mapa `C` con leyenda, profundidad y zoom; opción de ocultar.
- [x] Balizas `Q` con color y etiqueta; máximo 8.
- [x] Fantasma y prompt de cabria; indicador de línea válida/bloqueada.
- [x] Panel de tolva de campaña: contenido, capacidad, retirar.
- [x] Aviso de carga crítica y de derrame.
- [x] Tutorial contextual de la primera cabria y del primer mapa.

#### Balance

- [x] Medir el tiempo de retorno antes/después de la cabria; objetivo −30 % desde 80 m.
- [x] Verificar que las escaleras siguen siendo la opción barata y que la cabria no las anula.
- [x] Verificar que la tolva de campaña no reduce la tensión del viaje final.
- [x] Verificar que el derrame no es una pérdida injusta: debe ser recuperable y avisado.
- [x] Ajustar el coste de la cabria y del mapa para que no sean compras automáticas del Día 1.

#### QA y aceptación

- [x] `typecheck`, `build:web`, tests y auditorías.
- [x] Dos ventanas: colocar cabria, usarla, colocar tolva, depositar, late join.
- [x] Probar una ruta a 120 m con y sin cabria.
- [x] Probar el mapa con 0, 50 y 100 % de exploración.
- [x] Probar caída con carga crítica y recuperación de piezas.
- [x] 60 fps con mapa abierto y 8 balizas.
- [x] Documentar controles nuevos y actualizar `README.md`/`plan.md`.

**Criterio de salida:** el jugador puede planificar una ruta, construir una alternativa y volver con información. El viaje sigue existiendo, pero ya no es ciego.

---

### 4.3 Fase 3 — Escalado exponencial, sinergias y asimetría de builds

**Objetivo:** que el poder crezca por saltos, que ninguna mejora se desperdicie y que dos partidas con actas distintas se jueguen de forma distinta.

**Duración orientativa:** 5–7 semanas.

#### Diseño

- [x] Aprobar la curva de tres bandas y la tabla de patentes I–VI.
- [x] Aprobar la curva de pasivas `M(L) = min(6, 1 + 0.06L + 0.004L²)` y la tabla de conversión de excedentes.
- [x] Aprobar la fórmula de radio efectivo y los topes por herramienta.
- [x] Definir las 4 actas de operación y sus prohibiciones; decidir doctrina de equipo.
- [x] Definir 2 topologías además del cubo y 4–6 cláusulas.
- [ ] Definir 3 encargos, 4 certificaciones, 2 ranuras de utilidad y su persistencia.
- [ ] Escribir el guion de la primera acta y del primer encargo.
- [ ] Actualizar la tabla de cuotas del modo infinito solo después de la simulación.

#### Código

- [x] `src/config.ts`: `PATENTS`, `PASSIVE_CURVE`, `OVERFLOW`, `DOCTRINES`, `CLAUSES` (Fase 3A).
- [x] Nuevo `src/core/Progression.ts`: multiplicadores, topes, conversión y validación; tests puros.
- [x] `src/core/Combat.ts`: daño/carve con patentes y radio efectivo; cargas conformadas.
- [ ] Nuevo `src/core/Missions.ts`: generación determinista, estados, recompensas, validación.
- [ ] Nuevo `src/world/ServiceModules.ts`: módulos embebidos, señal, interacción y geometría procedural.
- [ ] `src/world/Resources.ts` / `Terrain.ts`: excluir volúmenes de módulos; orden de generación nuevo.
- [x] `src/core/Shop.ts` / `ShopView.ts`: actas, patentes, restricciones, descuentos y avisos de tope.
- [x] `src/core/DayCycle.ts`: cláusulas, fondo de reserva, duraciones y cuotas modificadas.
- [ ] `src/save/SaveManager.ts` v7: certificaciones, misiones, topología (Fase 3B).
- [ ] `src/network/Protocol.ts` v13: misiones, certificaciones, `platformDepth` (Fase 3B).
- [x] Tests: curva de patentes, topes, conversión de excedentes, doctrinas, cláusulas y reserva en Vitest.
- [ ] Tests de rendimiento con 3 módulos, 2 topologías y 6 supervisores.

#### UI

- [x] Pantalla de selección de acta con sello, ventajas y prohibiciones (`DoctrineModal.ts`).
- [ ] Panel de certificaciones y 2 ranuras de utilidad en la oficina (Fase 3B).
- [ ] Rastreador de encargos con señal, distancia y estado (Fase 3B).
- [x] Avisos de tope: `MÁXIMO · EXCEDENTE → DAÑO` y valor convertido (`ShopSideView.ts`).
- [x] Indicador de patente en el arma y en la tienda (`ToolView.ts`, `ItemIcon.ts`).
- [x] Barra superior de la tienda con acta, cláusulas y reserva.
- [ ] Modo Libro Mayor para cifras exactas (si no entra en Fase 4).
- [ ] Tutorial de la primera acta y del primer encargo.

#### Balance

- [x] Simular 25 días con cada acta; medir win rate, capital/min, cuota y uso de sistemas.
- [x] Objetivo: dispersión de actas ≤10 puntos en Día 15.
- [x] Objetivo: 0 mejoras desperdiciadas; cada tope convierte.
- [ ] Objetivo: 25–40 % de participación en encargos; ninguna certificación es obligatoria (Fase 3B).
- [x] Verificar que las cláusulas no hacen imposible una combinación.
- [x] Verificar que la cuota del Día 25 es difícil pero alcanzable con una build completa.
- [x] Ajustar la curva de patentes y la cuota juntas; no una sin la otra.

#### QA y aceptación

- [x] `typecheck`, `build:web`, tests y auditorías.
- [ ] Dos ventanas: acta compartida, encargo completado, certificación, late join, siguiente día (Fase 3B).
- [x] Determinismo: misma semilla y mismas posiciones de nodos en host/cliente.
- [x] Probar cada acta al menos una vez hasta el Día 15.
- [ ] Probar cada topología con y sin cabria (Fase 3B).
- [x] Probar los topes de todas las estadísticas y su conversión.
- [x] Documentar el protocolo v13/v14 y el guardado v7/v8 en `CLAUDE.md`, `plan.md` y skills.

**Criterio de salida:** el poder escala, las builds se distinguen y las misiones dan utilidades que el dinero no compra. Si una acta es obligatoria, no hay asimetría; si una certificación es obligatoria, no hay elección.

---

### 4.4 Fase 4 — Optimización masiva, UI de grandes números y *game feel*

**Objetivo:** sostener el endgame con números grandes, multitudes estadísticas y efectos contenidos, sin perder la lectura ni los 60 fps.

**Duración orientativa:** 6–8 semanas; se puede dividir en dos entregas.

#### Diseño

- [x] Definir el modo infinito: cuota, patentes, brigadas y metas de rendimiento.
- [x] Definir el **modo granel** y su desbloqueo; no debe eliminar el *game feel* para quien quiera pellets.
- [x] Definir brigadas, sectores, capataces y representación visual de multitud.
- [x] Definir la cinta de retorno y su límite de módulos.
- [x] Definir las etapas 4–5 de la huella y el final del modo infinito.
- [x] Definir el **Libro Mayor** y la accesibilidad (shake, FOV, tamaño de UI).
- [x] Escribir el plan de perfilado y el equipo objetivo.

#### Código

- [x] Nuevo `src/core/BigValue.ts`: aritmética, comparación, formato, serialización y tests.
- [x] Migrar cuota, capital, precios, stats y bonus a `BigValue`; posiciones y daños siguen en `number`.
- [x] `src/world/Loot.ts`: spatial hash, fusión, libro de exceso, modo granel y presupuesto.
- [x] `src/entities/Staff.ts`: LOD cerca/medio/lejos, sectores, brigadas y simulación estadística.
- [x] `src/entities/Avatars.ts`: multitud instanciada y siluetas simplificadas.
- [x] Nuevo `src/world/Conveyors.ts`: módulos, ruta, transporte de pellets y replicación.
- [x] `src/world/Terrain.ts`: carves por lotes, contador incremental, prioridad de chunks, LOD e historial comprimido.
- [x] Nuevo `src/core/PresentationBudget.ts`: tokens de partículas, luces, audio y shake.
- [x] `src/core/Effects.ts`, `Audio.ts`, `Player.ts`: consumir el presupuesto y aplicar degradación.
- [x] `src/world/Environment.ts` / `Landscape.ts`: etapas de huella, estéril, árboles muertos, carteles y cielo.
- [x] `src/ui/format.ts` / `UI.ts`: Libro Mayor, tooltips exactos, panel de brigadas y sectores, overlay de cintas.
- [x] `src/network/Protocol.ts` v14: brigadas, sectores, cintas, valores grandes como strings.
- [x] `src/save/SaveManager.ts` v8: brigadas, sectores, cintas, opciones de accesibilidad; migración v7/v6/v5.
- [x] Tests de soak: 10 días, 4 jugadores, 1.500 pellets, 4 brigadas, 30 módulos de cinta.

#### UI

- [x] Libro Mayor con modo corto/exacto y comparación de cifras.
- [x] Panel de brigadas: sector, headcount, rendimiento, coste.
- [x] Overlay de cintas y rutas; indicador de atasco.
- [x] Panel de endgame: cuota, capital, hitos, huella.
- [x] Accesibilidad: shake 0/50/100 %, FOV, escala de UI, contraste.
- [x] Avisos de degradación: si el juego baja el LOD, no debe parecer un bug.

#### Balance y rendimiento

- [x] 60 fps a 1080p en el equipo objetivo; 1 % low ≥45.
- [x] 10 días de soak sin crecimiento sostenido de memoria.
- [x] 4 jugadores + 4 brigadas + 30 cintas + 1.500 pellets sin caída por debajo de 45 fps.
- [x] Late join <5 s con snapshot máximo.
- [x] Ninguna mejora topada se desperdicia.
- [x] El día 30 simulado no rompe la economía ni la UI.
- [x] Probar en GPU integrada y en Electron.

#### QA y aceptación

- [x] `typecheck`, `build:web`, `build:win`, tests y auditorías.
- [x] Prueba de 10 días en solitario y 5 días en cooperativo.
- [x] Prueba de migración v5 → v8.
- [x] Prueba de late join con brigadas y cintas.
- [x] Prueba de accesibilidad y de degradación visual.
- [x] Documentar límites, presupuestos y deuda restante en `plan.md`.

**Criterio de salida:** el endgame es legible, estable y sigue siendo Carbon Magnate: excavar, asegurar, izar, depositar y firmar el acta. Si el jugador solo ve números y partículas, se ha perdido la fantasía.

---

### 4.5 Dependencias y orden de implementación

```text
Fase 1: economía clara + retorno informado + tests
   │
   ├──> Fase 2: cabria/tolva/mapa/balizas
   │        │
   │        ├──> Fase 3: patentes + actas + misiones + topologías
   │        │        │
   │        │        └──> Fase 4: brigadas + cintas + BigValue + presupuesto
   │        │
   │        └──> (opcional) plataforma móvil / tiro de servicio
   │
   └──> Tests/CI desde el primer día
```

Dependencias críticas:

- **Patentes** dependen de la simulación de cuota de Fase 1. Sin una economía clara, no se sabe cuánto poder hace falta.
- **Misiones** dependen del orden de generación y de una versión nueva de protocolo. No se pueden añadir después “sin tocar nada”.
- **Brigadas** dependen de spatial hash de loot, guardado v8 y protocolo v14. No antes.
- **Plataforma móvil** depende de `SURFACE_DECK_Y` dinámico, spawn, oficina, tolva y snapshot. Es la función con mayor riesgo; se puede sustituir por tiro de servicio.
- **BigValue** solo debe entrar cuando la economía se acerque a 1e12; antes es complejidad prematura. Si el diseño final no supera 1e9, basta con formato corto y `number`.

### 4.6 Definición de terminado

Una fase se considera terminada solo si:

- [x] `npm run typecheck` y `npm run build:web` pasan.
- [x] Los tests nuevos pasan y el comando está documentado.
- [x] Las auditorías de las skills afectadas pasan (o sus warnings están justificados).
- [x] El flujo manual afectado se probó en navegador.
- [x] El flujo cooperativo afectado se probó con dos ventanas.
- [x] El guardado migra o se decide explícitamente no cambiar.
- [x] El protocolo sube de versión si cambió la forma de un mensaje o la generación.
- [x] `README.md`, `plan.md` y `CLAUDE.md` reflejan el estado.
- [x] No hay recursos externos nuevos.
- [x] No se rompió ningún invariante de determinismo, autoridad o no-envío-de-mallas.

### 4.7 Decisiones abiertas

Estas decisiones necesitan aprobación de producto antes de implementar. El documento propone una opción, pero no las cierra por el usuario.

| Decisión | Opciones | Recomendación | Impacto |
|---|---|---|---|
| Excedente de carbón | Canje inmediato vs fondo de reserva | Canje en Fase 1; reserva en Fase 3 | Economía y UI |
| Doctrina | Equipo vs individual | Equipo | Cooperativo y balance |
| Omisión de capas | Plataforma móvil vs tiro de servicio | Tiro de servicio en Fase 2; plataforma en Fase 3/4 | Arquitectura de superficie |
| Salud/daño de jugador | Añadir vs no añadir | No añadir; usar carga/derrame | Game feel y frustración |
| Persistencia de certificaciones | Solo expediente vs meta-cuenta | Solo expediente | Roguelite y guardado |
| BigValue | `number` + formato vs mantisa/exponente | BigValue solo si se supera 1e12 | Precisión y complejidad |
| Número de topologías | 2 vs 4 | 2 en Fase 3; 4 en Fase 4 | Contenido y generación |
| Cintas | Automatización total vs módulos limitados | Módulos limitados | Rendimiento y decisiones |
| Brigadas | 6 supervisores vs multitudes | Supervisores + brigadas | Simulación y guardado |
| Público objetivo | Navegador modesto vs escritorio potente | Navegador modesto como mínimo | Presupuestos y arte |

### 4.8 Lo que no se debe hacer

- No copiar nombres, cifras, tiers, clases, mapas, misiones, textos ni lore del referente.
- No eliminar capas en silencio: si se omite una capa, debe verse el estéril y pagarse un acta.
- No enviar mallas, posiciones de fragmentos ni arrays completos de nodos por tick.
- No mover compras, cuota, fin de día, cofres o certificaciones al cliente.
- No crear un contador global de empleados: cada brigada es un registro con id.
- No añadir topes invisibles: todo tope tiene UI y conversión.
- No usar `Math.random()` en generación, semillas, IDs ni recompensas.
- No superar los presupuestos de entidades sin degradación.
- No añadir imágenes, modelos, fuentes ni audio externos.
- No convertir el juego en un idle sin espacio: la excavación, la tolva y el regreso son el corazón.

---

## 5. Anexos

### Anexo A — Plan de pruebas mínimo

No hay runner de tests en el repositorio. La Fase 1 debe introducirlo antes de tocar la economía a fondo.

| Nivel | Herramienta | Qué cubre | Cuándo |
|---|---|---|---|
| Unitario | Vitest | Minerales, cuotas, depósito, liquidación, formatos, curvas, conversión, BigValue | Cada cambio de balance/config |
| Determinismo | Vitest + semillas fijas | Orden terreno → módulos → recursos → carves → nodos; IDs; dropSeed | Cambios de mundo/misiones |
| Snapshot | Vitest | Validadores, límites de 512 KiB, late join, strings grandes | Cambios de protocolo |
| Migración | Vitest | v5 → v6 → v7 → v8, campos ausentes, datos corruptos | Cambios de guardado |
| Smoke E2E | Playwright o harness Electron/CDP | Menú → día → carve → recoger → tolva → liquidación → tienda → día+1 | Cada fase |
| Co-op | Dos ventanas | Host/cliente, late join, depósito, cabria, misión, brigada | Cada fase con red |
| Rendimiento | Harness local | Frame time, draw calls, triángulos, memoria, 10 días | Fase 1 y Fase 4 |
| Accesibilidad | Manual | Shake 0/50/100, FOV, escala UI, contraste | Fase 4 |

**Comandos a documentar cuando existan:**

```bash
npm test
npm test -- <archivo>
npm run test:e2e
npm run typecheck
npm run build:web
```

No afirmar que se han ejecutado tests automáticos mientras no existan. Las auditorías actuales son estáticas y no sustituyen a un playtest.

### Anexo B — Glosario

| Término | Definición |
|---|---|
| **Cuota de carbono** | Toneladas de carbón que deben depositarse en la tolva para sobrevivir al día. No paga capital. |
| **Capital de reposición** | Dinero obtenido de minerales, prima y canje; se gasta en la oficina. |
| **Carga no asegurada** | Minerales y carbón en la mochila que aún no han llegado a la tolva. |
| **Ley de merma** | Regla por la que el carbón profundo rinde menos toneladas útiles por HP. |
| **Prima de puntualidad** | Capital extra por cubrir la cuota pronto y volver antes del cierre. |
| **Reloj de retorno** | Estimación local del tiempo necesario para volver a la tolva. |
| **Acta de operación** | Arquetipo de partida que prohíbe o altera sistemas enteros. |
| **Cláusula de la junta** | Modificador de partida que cambia una regla económica o espacial. |
| **Certificación de campo** | Recompensa de misión no comprable; ocupa una ranura de utilidad. |
| **Encargo de galería** | Misión in-situ en un módulo de servicio embebido en la roca. |
| **Tolva de campaña** | Punto de acopio intermedio que no acredita cuota. |
| **Cabria de contrapeso** | Ruta vertical expresa con cable y jaula. |
| **Cinta de retorno** | Red modular que mueve fragmentos por un recorrido visible. |
| **Plataforma de servicios móvil** | Base que desciende al cerrar una capa; omite el descenso repetido. |
| **Brigada** | Contrato de cuadrilla con id, sector y headcount; se simula estadísticamente. |
| **Presupuesto sensorial** | Límite dinámico de partículas, luces, audio y shake por frame. |
| **Libro Mayor** | Modo de UI que muestra cifras exactas y su formato corto. |
| **Huella de explotación** | Estado visual y narrativo de la degradación de la superficie. |
| **Modo granel** | Desbloqueo que acredita el yield sin crear todos los pellets físicos. |

### Anexo C — Primer sprint recomendado

Si solo se puede hacer una entrega pequeña antes de comprometer las cuatro fases, hacer esta:

1. [x] Cambiar `MINERALS` de carbón: `moneyYield = 0`, carbón 8/14/20/30.
2. [x] Añadir la prima y el canje en `DaySettlement` con tests.
3. [x] Separar en el HUD `CUOTA`, `CARGA` y `CAPITAL`.
4. [x] Añadir un reloj de retorno heurístico y una cinta de rumbo.
5. [x] Invocar `playQuotaWarning()` a 30/15/5 s.
6. [ ] Playtest de 5 personas y comparar con la hipótesis.
7. [x] No tocar protocolo, guardado ni red en este sprint.

Este sprint valida la hipótesis más importante del documento con el menor riesgo posible: **si separar las divisas y dar información de retorno mejora las decisiones, el resto del plan tiene sentido; si no, hay que revisar el bucle antes de añadir sistemas**.

---

### Cierre

Carbon Magnate no necesita parecerse más a su referente. Ya tiene una fantasía propia que puede sostener el género: un operario atrapado entre una cuota, una tolva y un pozo que se traga el paisaje. La adaptación a 3D no consiste en copiar sistemas 2D y añadir un eje Z; consiste en hacer que **el volumen, la verticalidad, la luz y la orientación** sean las variables que el jugador aprende a dominar.

El orden propuesto es deliberado: primero verdad económica, después información espacial, luego poder y asimetría, y al final escala. Invertir ese orden produce un juego con más números, más partículas y menos decisiones. Este plan propone lo contrario: **menos sistemas, pero cada uno con una decisión que el jugador recuerda**.



