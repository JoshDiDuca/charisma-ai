import { BrowserWindow, session } from 'electron'
import path, { join } from 'node:path'
import log from 'electron-log';

import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'
import { logError } from 'main/services/log/logService';

export let mainWindow: Electron.BrowserWindow | null = null

export async function MainWindow() {
  const window = createWindow({
    id: 'main',
    title: displayName,
    width: 1400,
    height: 1000,
    show: false,
    center: true,
    movable: true,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: true,

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  // Auto-approve media permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Always allow audio/video permissions
    } else {
      callback(false);
    }
  });

  window.webContents.on('did-finish-load', () => {
    if (ENVIRONMENT.IS_DEV) {
      window.webContents.openDevTools({ mode: 'detach' })
    }

    window.show()
  })

  window.on('close', () => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.destroy()
    }
  })
  mainWindow = window;
  return window
}
