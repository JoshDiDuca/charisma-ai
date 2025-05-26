import { app } from 'electron'
import log from 'electron-log'
log.initialize()
console.log = log.log // Replace default console

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { MainWindow } from './windows/main'
import { initializeHandlers } from './handlers'
import { performSplashLoading, SplashWindow } from './windows/splash'

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()


  // Setup IPC handlers
  initializeHandlers();

  const splashWindow = await SplashWindow(() =>
    performSplashLoading().then(() => {
      splashWindow.hide();
      makeAppSetup(MainWindow)
    })
  );
})
