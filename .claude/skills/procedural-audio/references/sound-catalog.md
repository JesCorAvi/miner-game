# Catálogo de sonidos

Todos los métodos viven en `AudioEngine` (`src/core/Audio.ts`). Reutiliza antes de añadir.

## Posicionales (3D)

| Método | Uso | Diseño |
|---|---|---|
| `playPickaxe(position, layer, hasNode, isOre)` | Golpe de pico | 4 capas: crujido de ruido saturado en dos ráfagas, clink de triángulo/cuadrado, sub thud 150→42 Hz y pitch aleatorio ±12 %; `isOre` sube el clink |
| `playUnload(position)` | Vaciado de inventario | Ruido bandpass + dos tonos descendentes rápidos |
| `playNodeBreak(position, isOre)` | Rotura de veta/cofre | Ruido lowpass/highpass + triángulo; mineral añade tonos agudos |
| `playShot(position, weapon)` | Disparo de armas | Un diseño por `shotgun`, `tesla`, `grenade`, `drill`, `pickaxe` |
| `playExplosion(position, radius)` | Granada | Ruido grave + sawtooth/sine; escala con radio |
| `playDeposit(position, fromStaff)` | Depósito en tolva | Ruido + tonos ascendentes; plantilla más suave |
| `playLadder(position)` | Colocación de escalera | Ruido bandpass + triángulo/cuadrado |
| `playPickup(position, index)` | Recogida de fragmento | Dos senos + tick agudo; ráfaga ascendente 600–1400 Hz con delay escalonado |
| `playChest(position)` | Cofre abierto | Arpegio de 4 notas + ruido |
| `playFootstep(position, running, layer)` | Paso | Ruido lowpass + seno grave; throttle 100 ms |

## No posicionales (UI/estado)

| Método | Uso | Diseño |
|---|---|---|
| `playUi()` | Clic/confirmación suave | Cuadrado 720→580 Hz, 35 ms |
| `playError()` | Acción rechazada | Sawtooth + cuadrado descendente |
| `playPurchase()` | Compra | Triángulo/seno ascendente |
| `playQuotaWarning()` | Aviso de cuota | Dos triángulos descendentes |
| `playDayComplete(success)` | Fin de día | Arpegio mayor o ruido/tono grave |
| `playVictory()` | Victoria corporativa | Arpegio largo de 6 notas |
| `playDisconnect()` | Desconexión | Cuadrados descendentes |

## Loops y ambiente

| Método | Uso |
|---|---|
| `setJetpackActive(active)` | Propulsión del jetpack |
| `setDrillActive(active)` | Taladro continuo |
| `buildAmbient()` | Drone grave + ruido de mina/viento |
| `updateListener(camera)` | Posición/orientación del oyente |

## Semántica de disparo

- Arma al disparar: `playShot` + FX visual (`Game.sendShotFx`).
- Nodo golpeado: `playPickaxe` o `playShot` según arma. En el pico se pasa `isOre` para añadir el clink metálico.
- Impacto del pico: `playPickaxe` combina `crunchNoise()` (bandpass + WaveShaper), `clink()` (highpass 1500 Hz) y `thud()` (150→42 Hz); usa el mismo `pitch` aleatorio en todas las capas.
- Fragmento recogido: `playPickup`, con un pop por pieza y pitch ascendente dentro de la ventana de ráfaga.
- Depósito: `playDeposit` + `playUnload` para el vaciado de stacks.
- Nodo roto: `playNodeBreak`.
- Recogida: `playPickup`; el host también lo reproduce para plantilla.
- Depósito: `playDeposit` en host/solo; el cliente lo reproduce localmente al enviar.
- Cofre: `playChest` al recibir la pasiva.
- Pasos: `Player` callback `onFootstep`.
- UI: `playUi` en acciones, `playError` en rechazos, `playPurchase` al comprar.
- Día: `playDayComplete(true/false)`; victoria: `playVictory`.
- Red: `playDisconnect` al cerrar sesión.

## Añadir un sonido

1. Decide si es posicional (pasa `THREE.Vector3`) o de UI (sin posición).
2. Reutiliza `playX` si el evento ya existe.
3. Si es nuevo, crea un método `playX()` que use `tone()`/`noise()`.
4. Usa ganancias dentro de la mezcla actual (0.01–0.4 según impacto).
5. Si es un loop, guarda el `GainNode` y añade un setter.
6. Añade throttle si puede repetirse por frame.
7. Llama desde `Game` en el evento, no en `update()` sin condición.
8. Ejecuta la auditoría y prueba con muteo.

## No hacer

- No cargues samples ni uses `fetch` de audio.
- No crees `AudioContext` nuevos.
- No conectes a `destination` saltándote el master.
- No dejes osciladores/loops sin parar.
- No uses `setInterval` para secuencias largas sin limpiar al salir.
- No dispares un sonido por frame sin throttle.
