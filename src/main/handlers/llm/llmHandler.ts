import { ipcMain } from 'electron'
import { IpcHandle } from 'main/factories/ipcs/IpcHandle'
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

export class LlmHandlers {
  @IpcHandle('get-installed-models')
  async getInstalledModels() {
    return getInstalledModels()
  }

  @IpcHandle('get-llm-status')
  async getOllamaStatus() {
    return getOllamaStatus()
  }

  @IpcHandle('download-model')
  async downloadModel(modelName: string) {
    return downloadModel(modelName)
  }

  @IpcHandle('send-message')
  async sendMessageWithEmbedding(message: string, model: string) {
    console.log(
      `sendMessageWithEmbedding received - message:`,
      message,
      `(type: ${typeof message})`,
      `model:`,
      model
    )
    return sendMessageWithEmbedding(message, model)
  }
}

export class Test {
  public test() {
    return ''
  }
}
