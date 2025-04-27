import { ipcMain } from 'electron'
import {
  getAllEmbeddingModels,
  getInstalledEmbeddingModels,
  getOllamaEmbeddingRetrieve,
  initOllamaEmbedding,
  sendMessageWithEmbedding,
} from 'main/services/ollama/ollamaEmbeddingService'
import {
  downloadModel,
  getAllModels,
  getInstalledModels,
  getOllamaStatus,
  sendMessage,
} from 'main/services/ollama/ollamaService'
import { IpcHandle } from '../IpcHandle'
import { getCurrentStatus } from 'main/services/statusService'

export const MODEL_DOCUMENTS = []

export class LlmHandlers {
  @IpcHandle('get-installed-models')
  async getInstalledModels() {
    return getInstalledModels()
  }
  @IpcHandle('get-installed-embedding-models')
  async getInstalledEmbeddingModels() {
    return getInstalledEmbeddingModels()
  }
  @IpcHandle('get-all-embedding-models')
  async getAllEmbeddingModels() {
    return getAllEmbeddingModels()
  }
  @IpcHandle('get-all-models')
  async getAllModels() {
    return getAllModels()
  }

  @IpcHandle('get-llm-status')
  async getOllamaStatus() {
    return getOllamaStatus()
  }

  @IpcHandle('get-app-status')
  async getStatus() {
    return getCurrentStatus()
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
