import { ipcMain } from 'electron'
import {
  getOllamaEmbeddingRetrieve,
  initOllamaEmbedding,
  sendMessageWithEmbedding,
} from 'main/ollama/ollamaEmbeddingService'
import {
  downloadModel,
  getInstalledModels,
  sendMessage,
} from 'main/ollama/ollamaService'

export const MODEL_DOCUMENTS = [
  'Josh is a Software Developer',
  'Joshs full name is Joshua James Di-Duca',
  'Josh is originally from Stockton on tees in the United Kingdom',
  'Josh now lives in the United Kingdom',
  'Jimmy is a builder',
  'Jimmy lives in Cardif',
]

export function initializeLLMHandlers() {
  ipcMain.handle('get-installed-models', async () => getInstalledModels())

  ipcMain.handle('download-model', async (_, modelName: string) =>
    downloadModel(modelName)
  )

  ipcMain.handle('send-message', async (_, { message, model }) => {
    return await sendMessageWithEmbedding(message, model)
  })
}
