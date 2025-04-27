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


  const chromaService = new ChromaInstanceService()
  const ollamaService = new OllamaInstanceService()
  await ollamaService.start()
  await chromaService.start()

  initOllamaEmbedding([])

  // Setup IPC handlers
  initializeHandlers();

  app.on('will-quit', async (e) => {
    e.preventDefault()
    await chromaService.stop()
    await ollamaService.stop()
    app.exit()
  })

  // Catch process-level errors
  process.on('uncaughtException', error => {
    logError('Uncaught Exception:', { error });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection at:', { error: { promise, reason } });
  });

  await makeAppSetup(MainWindow)
})
