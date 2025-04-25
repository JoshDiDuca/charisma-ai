import { BrowserWindow } from 'electron'
import { join } from 'path'

import { ENVIRONMENT } from 'shared/constants'
import { createWindow } from 'main/factories'
import { displayName } from '~/package.json'
import { initializeLLMHandlers, MODEL_DOCUMENTS } from 'main/llm/llmHandler'
import { initOllamaEmbedding } from 'main/ollama/ollamaEmbeddingService'

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
    resizable: false,
    alwaysOnTop: false,
    autoHideMenuBar: true,

    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  initializeLLMHandlers()
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
