import { app, BrowserWindow, session, Tray, Menu, nativeImage } from 'electron'
import path, { join } from 'node:path'
import log from 'electron-log';

import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'
import { logError, logInfo } from 'main/services/log/logService';

export let mainWindow: Electron.BrowserWindow | null = null
let tray: Tray | null = null;
let isQuittingApp = false;

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
    setupTray()
  })

  // Modify close behavior to hide instead of close
  window.on('close', (event) => {
    if (!isQuittingApp) {
      event.preventDefault();
      window.hide();
      return false;
    }

    // If we are quitting, close all windows
    for (const win of BrowserWindow.getAllWindows()) {
      win.destroy()
    }
    return true;
  })

  mainWindow = window;
  return window
}

function setupTray() {
  try {
    let iconPath: string;
    if (app.isPackaged) {
      iconPath = join(process.resourcesPath, 'icon.png');
    } else {
      iconPath = join(app.getAppPath(), 'resources', 'icon.png');
    }

    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    tray.setToolTip(displayName);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: "Dev Tools",
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.openDevTools({ mode: 'detach' })
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Exit',
        click: () => {
          isQuittingApp = true;
          app.quit();
        }
      }
    ]);

    // Set the context menu
    tray.setContextMenu(contextMenu);

    // Handle left-click on the tray icon
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    logInfo('Tray icon created successfully');
  } catch (error) {
    logError(`Failed to create tray icon: ${error}`);
  }
}

// Add this to your main.ts
app.on('before-quit', () => {
  isQuittingApp = true;
});

// Clean up tray icon when app is about to quit
app.on('will-quit', () => {
  if (tray) {
    tray.destroy();
  }
});
