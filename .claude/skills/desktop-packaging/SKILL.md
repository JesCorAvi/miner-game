---
name: desktop-packaging
description: "Empaquetado Electron de Carbon Magnate: protocolo carbon://, seguridad del renderer, ventana y portable de Windows. Úsala al tocar electron/main.cjs, package.json, vite.config.ts o el build."
---

# Desktop Packaging

## Overview

Carbon Magnate se entrega como web (Vite) y como ejecutable portable de Windows. `electron/main.cjs` sirve `dist/` bajo el esquema seguro `carbon://`, sin preload ni acceso a Node desde el renderer. El runtime del juego debe seguir siendo 100 % compatible con navegador: Electron es una capa de empaquetado, no una dependencia del juego.

No hay Steam, Steamworks, lobby nativo ni puente `window.steam`. El multijugador es PeerJS tanto en navegador como en el ejecutable.

## When to Use

- Modificar `electron/main.cjs`, la ventana, el protocolo `carbon://` o el arranque.
- Añadir un tipo MIME, una ruta servida o una guarda de seguridad.
- Cambiar scripts de `package.json`, `build.files`, `build.win` o `vite.config.ts`.
- Ajustar el portable, el icono o la versión del ejecutable.
- Depurar el ejecutable (`npm run electron:preview`, `npm run build:win`).

## When Not to Use

- Cambiar lógica de juego, terreno o red: usa las skills de dominio.
- Cambiar HUD, tienda o pixel mode: usa `hud-and-shop`.
- Cambiar audio: usa `procedural-audio`.
- Añadir servicios o dependencias nativas: requiere aprobación explícita.

## Mandatory Workflow

1. **Clasifica la capa.** Main (`electron/main.cjs`), build (`package.json`, `vite.config.ts`) o renderer (`src/`). No mezcles responsabilidades.
2. **Define el contrato.** Si es una ruta nueva, decide URL, MIME y comportamiento en navegador.
3. **Mantén la seguridad.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, sin preload.
4. **Feature-detect en el renderer.** Si algo debe funcionar en navegador, añade fallback; no asumas Electron.
5. **Valida en desarrollo.** `npm run electron:dev` o `npm run electron:preview`.
6. **Empaqueta si toca.** `npm run build:win` y arranca `release/CarbonMagnate-2.0.0-portable.exe`.
7. **Audita.** `node .claude/skills/desktop-packaging/scripts/audit-electron.mjs`.

**Condición de parada:** si el cambio exige una decisión de producto (¿el navegador debe soportar esta función?), implementa la degradación segura y declara la suposición. No instales dependencias sin permiso.

## Decision Table

| Cambio | Main | Build | Renderer |
|---|---|---|---|
| Nueva ruta servida | `protocol.handle` + `MIME_TYPES` + guarda `DIST_ROOT` | — | URL relativa bajo `carbon://` |
| Nuevo tipo de archivo | Añadir MIME y extensión | Incluir en `dist/` | Uso normal |
| Ventana / foco / pantalla completa | `BrowserWindow` | — | Sin cambios |
| Icono / portable | — | `build/icon.svg`, `build.win`, `artifactName` | — |
| Dev vs. producción | `VITE_DEV_SERVER_URL` / `carbon://app/index.html` | `base: './'` | `import.meta.env.DEV` |
| Función solo-escritorio | **No** implementar aquí | — | Debe existir fallback web |

## Non-Negotiable Rules

- **Seguridad del renderer.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `backgroundThrottling: false`.
- **Sin preload ni Node en el renderer.** El juego no usa `require`, `process` ni APIs de Electron. No introduzcas un puente sin aprobación.
- **Esquema `carbon://`.** Debe declararse como `standard`, `secure`, `supportFetchAPI`, `corsEnabled` y `stream`, registrarse en una sesión con partición persistente y servirse con `protocol.handle`.
- **Path traversal.** Toda ruta se resuelve contra `DIST_ROOT`; si escapa, responde 403.
- **Navegación bloqueada.** `setWindowOpenHandler` deniega ventanas; `will-navigate` solo permite el prefijo de desarrollo o `carbon://app/`.
- **Menú nativo desactivado.** `Menu.setApplicationMenu(null)`; instancia única con `requestSingleInstanceLock`.
- **Base relativa.** `vite.config.ts` usa `base: './'` para que `carbon://app/index.html` cargue sus assets.
- **Empaquetado.** `build.files` incluye `dist/**/*`, `electron/**/*` y `package.json`; `build.win.target` es `portable` x64; el icono es `build/icon.svg`.
- **Sin restos de Steam.** No reintroduzcas `steam_appid.txt`, `steam_api64.dll`, `sendP2P`, `window.steam` ni `window.electron`.
- **Artefactos ignorados.** `dist/` y `release/` no se editan a mano ni se versionan.
- **Runtime compatible con navegador.** Cualquier cambio en `src/` debe seguir funcionando con `npm run dev` sin Electron.

## Validation Ladder

- **Nivel 0 — Estático:** `audit-electron.mjs` sin errores; protocolo, seguridad y empaquetado intactos.
- **Nivel 1 — Dev:** `npm run electron:dev` abre la ventana con Vite y sin errores de consola.
- **Nivel 2 — Preview:** `npm run electron:preview` sirve `dist/` bajo `carbon://` y el juego arranca.
- **Nivel 3 — Navegador:** `npm run dev` y `npm run build:web` siguen funcionando sin Electron.
- **Nivel 4 — Portable:** `npm run build:win`, el `.exe` arranca, carga `carbon://app/index.html` y no depende de Node en el renderer.

**Reporta el nivel alcanzado y qué no se pudo probar (por ejemplo, SmartScreen o firma de código).**

## Output Expectations

- Capa(s) modificadas y contrato de ruta/protocolo.
- Comportamiento en Electron y en navegador.
- Riesgos de seguridad o compatibilidad.
- Resultado de `audit-electron.mjs`.
- Nivel de validación alcanzado y artefactos generados.

## References

- `references/carbon-protocol-and-window.md` — `carbon://`, ventana, seguridad, navegación y ciclo de vida.
- `references/build-and-portable.md` — scripts, Vite, `electron-builder`, portable y verificación.

## Related Skills

- `hud-and-shop` — UI que debe funcionar igual en web y escritorio.
- `coop-netcode` — PeerJS funciona en ambos entornos.
- `procedural-content` — todos los activos se generan en el renderer.
