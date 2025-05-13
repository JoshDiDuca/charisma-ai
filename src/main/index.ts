import { app, ipcMain } from 'electron'
import log from 'electron-log'
log.initialize()
console.log = log.log // Replace default console

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { MainWindow } from './windows/main'
import { initializeHandlers } from './handlers'
import { initOllamaEmbedding } from './services/ollama/ollamaEmbeddingService'
import { logError } from './services/log/logService'
import { performSplashLoading, SplashWindow } from './windows/splash'

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()

  initOllamaEmbedding([])

  // Setup IPC handlers
  initializeHandlers();

  const splashWindow = await SplashWindow();
    performSplashLoading().then(() => {
      splashWindow.hide();
      makeAppSetup(MainWindow)
    })

})
