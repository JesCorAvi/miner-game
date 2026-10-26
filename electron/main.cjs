'use strict';

const { app, BrowserWindow, Menu, protocol, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const SCHEME = 'carbon';
const PARTITION = 'persist:carbon-magnate-v3';
const DEV_URL = process.env.VITE_DEV_SERVER_URL || '';
const DIST_ROOT = path.resolve(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.setName('Carbon Magnate');
app.setAppUserModelId('com.carbonmagnate.game');

let mainWindow = null;

function registerAppProtocol() {
  const appSession = session.fromPartition(PARTITION);
  appSession.protocol.handle(SCHEME, async (request) => {
    try {
      const requestUrl = new URL(request.url);
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (!pathname || pathname === '/') {
        pathname = '/index.html';
      }
      const target = path.resolve(DIST_ROOT, `.${pathname}`);
      if (target !== DIST_ROOT && !target.startsWith(`${DIST_ROOT}${path.sep}`)) {
        return new Response('Forbidden', { status: 403 });
      }
      const data = await fs.readFile(target);
      const extension = path.extname(target).toLowerCase();
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
          'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowedPrefix = DEV_URL || `${SCHEME}://app/`;
    if (!navigationUrl.startsWith(allowedPrefix)) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadURL(`${SCHEME}://app/index.html`);
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerAppProtocol();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
