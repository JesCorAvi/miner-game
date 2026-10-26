# AudioEngine

## Cadena de audio

```
fuente (oscilador / buffer de ruido)
  → filtro / ganancia
  → panner (si es posicional) o master
  → master (GainNode, 0.64)
  → compresor (threshold -14, ratio 4.5)
  → context.destination
```

- `MIN_GAIN = 0.0001` para rampas exponenciales.
- `master.gain` arranca a 0.64; `setMuted(true)` lo baja a 0 con `setTargetAtTime`.
- El ambiente (`buildAmbient`) y los loops (`buildLoops`) se conectan a `master`.

## Ciclo de vida

- `init()`:
  - Si el contexto existe, reanuda si está suspendido.
  - Si no, crea `AudioContext`, master, compresor, ruido, ambiente y loops.
  - Marca `ready = true`.
- `resume()`: reanuda o inicializa.
- `dispose()`: `ready = false`, suelta `jetpackGain`/`drillGain`, cierra el contexto y anula referencias.
- El `AudioContext` se crea tras el primer `pointerdown`; no en el constructor de `Game`.

## One-shots

`noise(position, filterType, frequency, duration, gainValue, delay, q)`:

- Crea `BufferSource` del ruido pregenerado.
- Filtro `BiquadFilter` y ganancia con rampas `MIN_GAIN → valor → MIN_GAIN`.
- Si `position`, crea un `PannerNode`; al terminar, desconecta el panner.
- `source.start(start, offset, duration)`, `source.stop(start + duration + 0.04)`.

`tone(position, type, frequency, duration, gainValue, delay, endFrequency?)`:

- Crea `OscillatorNode`, aplica rampa de frecuencia si `endFrequency`.
- Ganancia con rampas seguras.
- `oscillator.start(start)`, `stop(start + duration + 0.03)`.
- Panner desconectado en `onended`.

## Paneo

- `panner(position)`:
  - `panningModel = 'HRTF'`, `distanceModel = 'inverse'`.
  - `refDistance = 1.2`, `maxDistance = 75`, `rolloffFactor = 1.25`.
  - Conecta a `master`.
- `updateListener(camera)` actualiza posición y orientación del listener cada frame desde la cámara.
- Los sonidos de UI (`playUi`, `playError`, `playPurchase`, `playDayComplete`, `playVictory`, `playDisconnect`) no usan panner.

## Loops

- `buildLoops()` crea:
  - Jetpack: ruido bandpass + tono sawtooth, conectado a `jetpackGain`.
  - Taladro: ruido bandpass + motor sawtooth, conectado a `drillGain`.
- `setJetpackActive(active)` y `setDrillActive(active)` usan `setTargetAtTime` (0.07/0.04).
- `Game.update()` los activa según fase, lock, arma y estado del jugador.
- `dispose()` debe soltar las referencias.

## Ambiente

`buildAmbient()`:

- Oscilador grave 41 Hz + armónico 67 Hz.
- Ruido lowpass 155 Hz y viento bandpass 310 Hz.
- Se conecta a `master` con ganancia baja (0.032) y no se detiene hasta cerrar el contexto.
- No crees un segundo ambiente al reinit.

## Muteo

- `muted` es estado interno.
- `setMuted(true)` baja master a 0; `setMuted(false)` lo sube a 0.64.
- `toggleMuted()` devuelve el nuevo estado.
- `Session.toggleMute()` llama a `game.audio.toggleMuted()` y reproduce `playUi()`.
- `M` y el botón `hud-mute` comparten la misma acción.

## Throttle

- `playPickup()`: ventana de ráfaga de 220 ms; los pops se escalonan hasta 0,2 s para que una recogida múltiple suene como una cascada. Los pasos mantienen un throttle de 100 ms.
- `playFootstep()`: mínimo 100 ms.
- Si añades un sonido que puede dispararse por frame, aplica un límite similar.

## Errores típicos

- Crear un `AudioContext` fuera de `AudioEngine`.
- Conectar una fuente directamente a `destination`.
- Ramp exponencial a 0 (invalida; usa `MIN_GAIN`).
- No detener osciladores/fuentes one-shot.
- No guardar la referencia de un loop y dejarlo sonando al salir.
- Iniciar audio antes del gesto del usuario.
