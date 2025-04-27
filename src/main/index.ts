import { app, ipcMain } from 'electron'
import log from 'electron-log'
log.initialize()
console.log = log.log // Replace default console

import { makeAppWithSingleInstanceLock } from 'lib/electron-app/factories/app/instance'
import { makeAppSetup } from 'lib/electron-app/factories/app/setup'
import { ChromaInstanceService } from './services/chroma/chromaInstanceService'
import { OllamaInstanceService } from './services/ollama/ollamaInstanceService'
import { MainWindow } from './windows/main'
import { initializeHandlers } from './handlers'
import { initOllamaEmbedding } from './services/ollama/ollamaEmbeddingService'
import { logError } from './services/log/logService'

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()

  initOllamaEmbedding([])

  // Setup IPC handlers
  initializeHandlers();

  await makeAppSetup(MainWindow)
})
