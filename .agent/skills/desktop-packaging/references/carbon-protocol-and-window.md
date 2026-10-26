# Protocolo carbon:// y ventana

## Registro del esquema

Al importar `electron/main.cjs`:

```js
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'carbon',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);
```

Sin estos privilegios, el renderer no puede cargar módulos, `fetch`, ni recursos con el comportamiento de un origen seguro.

## Servidor

- `DIST_ROOT = path.resolve(__dirname, '..', 'dist')`.
- `PARTITION = 'persist:carbon-magnate-v3'`.
- `session.fromPartition(PARTITION).protocol.handle('carbon', handler)`.
- El handler:
  - Decodifica `pathname`; `/` → `/index.html`.
  - `target = path.resolve(DIST_ROOT, \`.${pathname}\`)`.
  - Si `target !== DIST_ROOT` y no empieza por `DIST_ROOT + path.sep` → 403.
  - Lee el archivo con `fs/promises.readFile`.
  - Devuelve `Response` con `Content-Type` del mapa `MIME_TYPES` y caché:
    - HTML: `no-store`.
    - Resto: `public, max-age=31536000, immutable`.
  - Si falla, 404.

Mapa MIME: html, js, mjs, css, json, svg, png, jpg/jpeg, webp, ico, woff2, wasm, map.

## Ventana

```js
new BrowserWindow({
  width: 1440,
  height: 900,
  minWidth: 1024,
  minHeight: 640,
  show: false,
  backgroundColor: '#06090a',
  autoHideMenuBar: true,
  title: 'Carbon Magnate',
  webPreferences: {
    partition: PARTITION,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    spellcheck: false,
    backgroundThrottling: false,
    webSecurity: true,
  },
});
```

- `show: false` + `ready-to-show` evita el flash blanco.
- `backgroundThrottling: false` mantiene el bucle a 60 Hz al cambiar de ventana.
- No hay `preload`.
- `setWindowOpenHandler(() => ({ action: 'deny' }))`.
- `will-navigate` solo permite `DEV_URL` o `carbon://app/`.
- `Menu.setApplicationMenu(null)`.
- `requestSingleInstanceLock()`; la segunda instancia enfoca la existente.
- `app.whenReady()` registra el protocolo y crea la ventana.
- `window-all-closed` → `app.quit()`.

## Desarrollo y producción

- Desarrollo: `VITE_DEV_SERVER_URL` (Vite en 5173) → `mainWindow.loadURL(DEV_URL)`.
- Producción: `mainWindow.loadURL('carbon://app/index.html')`.
- `vite.config.ts` debe tener `base: './'` para que los assets relativos funcionen bajo `carbon://`.

## Seguridad

- El renderer nunca recibe `ipcRenderer`, `require`, `process` ni `fs`.
- El juego no debe detectar Electron para funcionar; si en el futuro se añade una función nativa, debe existir fallback web.
- Bloquea ventanas emergentes y navegación externa.
- No añadas `nodeIntegration: true`, `contextIsolation: false` ni `webSecurity: false`.
- No sirvas archivos fuera de `dist/`.

## Depuración

- `npm run electron:dev`: Vite + Electron.
- `npm run electron:preview`: build + Electron sobre `dist/`.
- Consola: `Ctrl+Shift+I` (si está habilitada en el build de desarrollo).
- Si `carbon://` da 404, revisa que `dist/index.html` exista y que `DIST_ROOT` apunte a `dist/`.
- Si una ruta da 403, revisa el path traversal y la codificación de la URL.
- Si el juego va lento al cambiar de ventana, revisa `backgroundThrottling`.
