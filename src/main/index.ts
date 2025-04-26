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

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()


  const chromaService = new ChromaInstanceService()
  const ollamaService = new OllamaInstanceService()
  await ollamaService.start()

  initOllamaEmbedding([])

  // Setup IPC handlers
  initializeHandlers();

  ipcMain.handle('start-chromadb', async () => {
    await chromaService.start()
    return true
  })

  ipcMain.handle('get-chromadb-config', () => {
    return chromaService.getClientConfig()
  })

  // Clean up on quit
  app.on('will-quit', async (e) => {
    e.preventDefault()
    await chromaService.stop()
    await ollamaService.stop()
    app.exit()
  })

  await makeAppSetup(MainWindow)
})
