import { app, ipcMain } from 'electron'
import log from 'electron-log'
log.initialize()
console.log = log.log // Replace default console

import { makeAppSetup, makeAppWithSingleInstanceLock } from './factories'
import { MainWindow, registerAboutWindowCreationByIPC } from './windows'
import { ChromaInstanceService } from './services/chroma/chromaInstanceService'
import { OllamaInstanceService } from './services/ollama/ollamaInstanceService'

makeAppWithSingleInstanceLock(async () => {
  await app.whenReady()

  const chromaService = new ChromaInstanceService()
  const ollamaService = new OllamaInstanceService()
  await ollamaService.start()

  // Create your window here

  // Setup IPC handlers
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

  registerAboutWindowCreationByIPC()
})
