import { app, BrowserWindow, session, Tray, Menu, nativeImage, ipcMain } from 'electron'
import path, { join } from 'node:path'

import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT, IPC } from 'shared/constants'
import { displayName } from '~/package.json'
import { logError, logInfo } from 'main/services/log/logService';
import { mainWindow } from './main'
import { MainScreen } from 'renderer/screens'
import { ollamaService, piperService, ttsService } from 'lib/electron-app/factories/app/setup'


export let splashWindow: Electron.BrowserWindow | null = null
let isQuittingApp = false;

export async function SplashWindow(onLoad?: () => void) {
const window = createWindow({
  id: 'splash',
  title: `${displayName} - Secondary`,
  width: 300,
  height: 400,
  show: true,
  center: true,
  alwaysOnTop: true,
  frame: false,
  parent: mainWindow || undefined, // Optional: make it a child window
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
})

  window.webContents.on('did-finish-load', () => {
    if (ENVIRONMENT.IS_DEV) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
    onLoad?.();

  });

  window.on('close', (event) => {
    if (!isQuittingApp) {
      event.preventDefault();
      window.hide();
      return false;
    }
    return true;
  });

    window.show();

  splashWindow = window;
  return window;
}

export async function performSplashLoading() {
  await ollamaService.start();
  await piperService.start();

  if(!ENVIRONMENT.DISABLE_TTS_ON_START){
    ttsService.start()
  }

  let ollamaDone = ollamaService.ready;
  let piperDone = piperService.ready;

  const checkIfBothReady = (done?: (param: any) => any) => {
    if((ollamaDone || ollamaService.ready) && (piperDone || piperService.ready)){
      done?.(true);
      return true;
    }
    return false;
  }

  if(checkIfBothReady()){
    return true;
  }

  return new Promise((resolve) => {

    ollamaService.downloadService.on("done", () => {
      ollamaDone = true;
      checkIfBothReady(resolve);
    })
    piperService.downloadService.on("done", () => {
      piperDone = true;
      checkIfBothReady(resolve);
    })
  });
}
