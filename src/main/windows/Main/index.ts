import { BrowserWindow } from 'electron'
import { join } from 'path'

import { ENVIRONMENT } from 'shared/constants'
import { createWindow } from 'main/factories'
import { displayName } from '~/package.json'
import {
  initializeLLMHandlers,
  MODEL_DOCUMENTS,
} from 'main/handlers/llm/llmHandler'
import { initOllamaEmbedding } from 'main/services/ollama/ollamaEmbeddingService'
import { initializeFileHandler } from 'main/handlers/fileHandler'
import { initializeHandlers } from 'main/handlers'

export let mainWindow: BrowserWindow | null = null

export async function MainWindow() {
  const window = createWindow({
    id: 'main',
    title: displayName,
    width: 1000,
    height: 720,
    show: false,
    center: true,
    movable: true,
    resizable: true,
    alwaysOnTop: false,
    autoHideMenuBar: true,

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  initializeHandlers()
  initOllamaEmbedding(MODEL_DOCUMENTS)

  window.webContents.on('did-finish-load', () => {
    if (ENVIRONMENT.IS_DEV) {
      window.webContents.openDevTools({ mode: 'detach' })
    }

    window.show()
  })

  window.on('close', () =>
    BrowserWindow.getAllWindows().forEach((window) => window.destroy())
  )

  mainWindow = window

  return window
}
