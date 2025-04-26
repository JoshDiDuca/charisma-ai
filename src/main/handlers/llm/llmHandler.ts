import { ipcMain } from 'electron'
import {
  getOllamaEmbeddingRetrieve,
  initOllamaEmbedding,
  sendMessageWithEmbedding,
} from 'main/services/ollama/ollamaEmbeddingService'
import {
  downloadModel,
  getInstalledModels,
  getOllamaStatus,
  sendMessage,
} from 'main/services/ollama/ollamaService'

export const MODEL_DOCUMENTS = []

export function initializeLLMHandlers() {
  ipcMain.handle('get-installed-models', async () => getInstalledModels())
  ipcMain.handle('get-llm-status', async () => getOllamaStatus())

  ipcMain.handle('download-model', async (_, modelName: string) =>
    downloadModel(modelName)
  )

  ipcMain.handle('send-message', async (_, { message, model }) => {
    return await sendMessageWithEmbedding(message, model)
  })
}
