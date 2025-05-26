import { join } from 'node:path'
import { createWindow } from 'lib/electron-app/factories/windows/create'
import { ENVIRONMENT } from 'shared/constants'
import { displayName } from '~/package.json'
import { mainWindow } from './main'
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
      //window.webContents.openDevTools({ mode: 'detach' });
    }
    window.show();
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

  splashWindow = window;
  return window;
}

export async function performSplashLoading() {
  await performServicesStart();

  let ollamaDone = ollamaService.ready;
  let piperDone = piperService.ready;

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

export const checkIfBothReady = (done?: (param: any) => any) => {
  let ollamaDone = ollamaService.ready;
  let piperDone = piperService.ready;

  if((ollamaDone || ollamaService.ready) && (piperDone || piperService.ready)){
    done?.(true);
    return true;
  }
  return false;
}
export const checkIfBothNeedUpdate = async () => {
  let ollamaNeedsUpdate = await ollamaService.needsUpdate();
  let piperNeedsUpdate = await piperService.needsUpdate();

  if(piperNeedsUpdate || ollamaNeedsUpdate){
    return true;
  }
  return false;
}

export const performServicesStart = async () => {

  await ollamaService.start();
  await piperService.start();

  if(!ENVIRONMENT.DISABLE_TTS_ON_START){
    ttsService.start()
  }
}
