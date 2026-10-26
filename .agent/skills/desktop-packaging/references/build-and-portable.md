# Build y portable de Windows

## Scripts

```bash
npm install
npm run dev              # Vite en http://127.0.0.1:5173
npm run typecheck        # tsc --noEmit (strict, noUnusedLocals/Parameters)
npm run build:web        # typecheck + vite build → dist/
npm run electron:dev     # Vite 5173 + Electron (puerto libre)
npm run electron:preview # build web + Electron sobre dist/
npm run build:win        # build web + electron-builder portable
```

- `main`: `electron/main.cjs`.
- Node requerido: `>=22.12.0`.
- `dev` usa `vite --host 127.0.0.1`.
- `electron:dev` usa `concurrently`, `wait-on` y `cross-env`; exige el puerto 5173 libre.
- `build:win` genera `release/CarbonMagnate-2.0.0-portable.exe`.

## Vite

```ts
export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', sourcemap: false },
});
```

- `base: './'` es obligatorio para `carbon://`.
- `strictPort` evita que Electron cargue otro puerto.
- `target: 'es2022'` es compatible con Electron 45 y navegadores modernos.

## electron-builder

Configuración relevante en `package.json`:

```json
{
  "build": {
    "appId": "com.carbonmagnate.game",
    "productName": "Carbon Magnate",
    "executableName": "CarbonMagnate",
    "asar": true,
    "npmRebuild": false,
    "directories": { "output": "release", "buildResources": "build" },
    "files": ["dist/**/*", "electron/**/*", "package.json"],
    "win": {
      "target": [{ "target": "portable", "arch": ["x64"] }],
      "icon": "build/icon.svg",
      "artifactName": "CarbonMagnate-${version}-portable.${ext}"
    },
    "portable": {
      "artifactName": "CarbonMagnate-${version}-portable.exe"
    }
  }
}
```

- `asar: true` empaqueta el código.
- `npmRebuild: false` evita reconstruir dependencias nativas.
- `build/icon.svg` es el icono; `public/favicon.svg` es el de la web.
- No añadas `steam_appid.txt` ni DLL de Steam: no forman parte de este proyecto.

## Verificación

1. `npm run typecheck`.
2. `npm run build:web` y comprobar `dist/index.html`.
3. `npm run electron:preview` y comprobar que carga `carbon://app/index.html`.
4. `npm run build:win`.
5. Arrancar `release/CarbonMagnate-2.0.0-portable.exe`.
6. Comprobar menú, partida, audio tras clic, multijugador y cierre.
7. Verificar que el ejecutable no depende de Node ni de archivos fuera del portable.

## Artefactos

- `dist/` y `release/` están ignorados por Git.
- No edites `dist/` ni `release/` a mano.
- No commitees `node_modules/`, lockfiles modificados a mano ni binarios.
- El `.exe` no está firmado; SmartScreen puede avisar. Es una limitación conocida, no un fallo del build.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| Pantalla en blanco bajo `carbon://` | `base` no es `'./'` o falta `dist/index.html` |
| 404 en un asset | No está en `dist/` o el MIME no está en `MIME_TYPES` |
| 403 al cargar | Ruta fuera de `DIST_ROOT` o path traversal |
| Electron abre Vite en producción | `VITE_DEV_SERVER_URL` definido por error |
| El puerto 5173 está ocupado | Cierra el proceso o usa `electron:preview` |
| El `.exe` no arranca | Revisa `files`, `main` y que `electron/main.cjs` exista |
