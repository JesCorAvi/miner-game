---
name: procedural-audio
description: "Audio 100 % sintetizado con Web Audio en Carbon Magnate: AudioEngine, muteo, paneo 3D, loops y desbloqueo por gesto. Úsala al añadir sonidos, mezcla o ajustes de audio."
---

# Procedural Audio

## Overview

Carbon Magnate no usa archivos de audio. `src/core/Audio.ts` implementa `AudioEngine` con Web Audio: un `AudioContext` perezoso, `master` → compresor → `destination`, ruido sintetizado, osciladores, paneo 3D por `PannerNode`, ambiente continuo y bucles de jetpack/taladro.

El contexto se crea tras el primer gesto del usuario (`pointerdown`) y se reanuda si queda suspendido. El muteo global corta one-shots y bucles. Los sonidos del escuadrón usan posiciones 3D; los de UI son estéreo directo.

## When to Use

- Añadir un efecto de arma, impacto, nodo, cofre, depósito, escalera, paso, UI o estado del jugador.
- Crear o ajustar un drone ambiental, un loop de jetpack/taladro o una sirena.
- Corregir volumen, muteo, clipping, nodos huérfanos o falta de paneo.
- Tocar el gesto de desbloqueo o el listener 3D.

## When Not to Use

- Crear geometría, materiales o texturas: usa `procedural-content`.
- Cambiar el HUD que dispara el sonido: usa `hud-and-shop`.
- Replicar audio por red: no se replica; cada cliente sintetiza sus propios FX locales.
- Cambiar la lógica de combate o economía: usa `balance-and-loop`.

## Mandatory Workflow

1. **Clasifica el sonido.** One-shot, secuencia corta, loop/drone o sonido semántico reutilizable.
2. **Busca uno existente.** Revisa `references/sound-catalog.md`; reutiliza antes de duplicar.
3. **Elige el patrón.** `tone()`/`noise()` para one-shots; `setJetpackActive`/`setDrillActive` para loops; `buildAmbient` para ambiente.
4. **Respeta la mezcla.** Todo pasa por `master` (y compresor); los sonidos posicionales pasan por `panner()`.
5. **Cierra los nodos.** Los one-shots crean, conectan, arrancan y paran; los loops guardan su `GainNode`.
6. **Conecta el disparador.** Llama al método desde `Game` en el evento correcto, no por frame sin throttle.
7. **Audita.** `node .claude/skills/procedural-audio/scripts/audit-audio.mjs`.
8. **Prueba.** Sin audio antes del gesto, con muteo, con volumen 0, en pausa y en co-op.

**Condición de parada:** si el diseño sonoro no está definido, usa un sonido existente como referencia y declara la suposición. No preguntes por frecuencias que ya siguen un patrón en `Audio.ts`.

## Decision Table

| Necesidad | Patrón | Nota |
|---|---|---|
| Clic, impacto, recogida | `tone()` / `noise()` con posición | Duración corta |
| Varios tonos encadenados | Varias llamadas `tone()` con `delay` | Guarda timers si el estado puede terminar |
| Sonido reutilizable | Método `playX()` en `AudioEngine` | Evita frecuencias mágicas en call sites |
| Drone/loop | Nodos persistentes + `GainNode` guardado | Jetpack y taladro ya existen |
| UI estándar | `playUi`, `playError`, `playPurchase` | Sin paneo |
| Día/victoria | `playDayComplete(success)`, `playVictory` | Sin paneo |
| Depósito/nodo/cofre | `playDeposit`, `playNodeBreak`, `playChest` | Con posición 3D |
| Jugador/escena | `playFootstep`, `playDisconnect` | Pasos con throttle |

## Non-Negotiable Rules

- **Cero archivos de audio.** Nada de `.mp3`, `.wav`, `.ogg`, `new Audio()` ni `AudioLoader`.
- **Un solo `AudioContext`.** Vive en `AudioEngine` (`src/core/Audio.ts`). Ningún otro módulo crea uno.
- **Gesto de usuario.** `Game` llama a `audio.init()` en el primer `pointerdown` con `{ once: true }`; no inicies audio en el constructor.
- **Mezcla centralizada.** Master → compresor → `destination`; los panners se conectan a `master`, nunca al `destination` directamente.
- **Rampas seguras.** `MIN_GAIN = 0.0001`; `exponentialRampToValueAtTime` nunca termina en 0.
- **One-shots limpios.** Cada fuente/oscilador se detiene y el panner se desconecta en `onended`.
- **Loops con referencia.** `jetpackGain` y `drillGain` se guardan y se ponen a 0 al desactivar; `dispose()` los suelta y cierra el contexto.
- **Muteo real.** `setMuted(true)` baja `master` a 0; `toggleMuted()` responde a `M` y al botón del HUD.
- **Listener por frame.** `Game.update()` llama a `audio.updateListener(this.camera)`.
- **Throttle o ráfaga.** Los pasos tienen límite temporal; las recogidas usan una ventana de ráfaga de 220 ms con pops escalonados para no saturar y mantener la sensación de cascada. No dispares un sonido por frame sin control.
- **Audio local.** Los `fx` de red son visuales; cada cliente sintetiza su propio audio, no se envían eventos de sonido.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-audio.mjs` sin archivos externos, contextos duplicados ni rampas a 0.
- **Nivel 1 — Gesto:** no suena nada antes del primer clic; después del gesto, el ambiente y los one-shots funcionan.
- **Nivel 2 — Mezcla:** muteo, volumen 0/100 y paneo se comportan; no hay clipping evidente.
- **Nivel 3 — Ciclo:** repetir 100 impactos/recogidas no deja nodos; jetpack y taladro se apagan al soltar.
- **Nivel 4 — Integración:** pausa, cambio de día, Alt+Tab, co-op y game over sin errores de `AudioContext`.

**Reporta el nivel alcanzado y qué escenario de mezcla o ciclo no se pudo probar.**

## Output Expectations

- Sonido(s) añadidos y método elegido.
- Frecuencias/duraciones/ganancias y por qué.
- Cambios de muteo, mezcla o desbloqueo.
- Resultado de `audit-audio.mjs`.
- Niveles de validación alcanzados y riesgos.

## References

- `references/audio-engine.md` — AudioEngine, mezcla, panner, loops, gesto y ciclo de vida.
- `references/sound-catalog.md` — catálogo de sonidos existentes y cuándo reutilizarlos.

## Related Skills

- `procedural-content` — feedback visual de impactos y mejoras.
- `hud-and-shop` — botón de muteo y sonidos de interacción.
- `balance-and-loop` — frecuencia de impactos, recogidas y eventos.
