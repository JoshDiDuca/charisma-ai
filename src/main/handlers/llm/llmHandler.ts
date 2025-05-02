import {
  getAllEmbeddingModels,
  getInstalledEmbeddingModels,
  sendMessageWithEmbedding,
} from 'main/services/ollama/ollamaEmbeddingService'
import {
  downloadModel,
  getAllModels,
  getInstalledModels,
  getOllamaStatus,
} from 'main/services/ollama/ollamaService'
import { IpcHandle } from '../IpcHandle'
import { getCurrentStatus } from 'main/services/statusService'
import { IPC } from 'shared/constants'
import { addMessageToConversation, createNewConversation, deleteConversation, generateConversationTitle, getAllConversations, getConversation, updateConversationTitle } from 'main/services/ollama/ollamaConversationService'
import { Message } from 'shared/types/Conversation'

export const MODEL_DOCUMENTS = []

export class LlmHandlers {
  @IpcHandle(IPC.LLM.GET_INSTALLED_MODELS)
  async getInstalledModels() {
    return getInstalledModels()
  }

  @IpcHandle(IPC.LLM.GET_INSTALLED_EMBEDDING_MODELS)
  async getInstalledEmbeddingModels() {
    return getInstalledEmbeddingModels()
  }

  @IpcHandle(IPC.LLM.GET_ALL_EMBEDDING_MODELS)
  async getAllEmbeddingModels() {
    return getAllEmbeddingModels()
  }

  @IpcHandle(IPC.LLM.GET_ALL_MODELS)
  async getAllModels() {
    return getAllModels()
  }

  @IpcHandle(IPC.LLM.GET_STATUS)
  async getOllamaStatus() {
    return getOllamaStatus()
  }

  @IpcHandle(IPC.CORE.GET_APP_STATUS)
  async getStatus() {
    return getCurrentStatus()
  }

  @IpcHandle(IPC.LLM.DOWNLOAD_MODEL)
  async downloadModel(modelName: string) {
    return downloadModel(modelName)
  }

  @IpcHandle(IPC.LLM.SEND_MESSAGE)
  async sendMessageWithEmbedding(message: string, model: string, conversationId: string | undefined) {
    return sendMessageWithEmbedding(message, model, conversationId)
  }

  @IpcHandle(IPC.CONVERSATION.GET_ALL)
  async getAllConversations() {
    return await getAllConversations();
  }

  @IpcHandle(IPC.CONVERSATION.GET)
  async getConversation(conversationId: string) {
    return await getConversation(conversationId);
  }

  @IpcHandle(IPC.CONVERSATION.DELETE)
  async deleteConversation(conversationId: string) {
    return await deleteConversation(conversationId);
  }

  @IpcHandle(IPC.CONVERSATION.CREATE)
  async createNewConversation(model: string, systemMessage?: string) {
    return await createNewConversation(model, systemMessage);
  }

  @IpcHandle(IPC.CONVERSATION.UPDATE_TITLE)
  async updateConversationTitle(conversationId: string, title: string) {
    return await updateConversationTitle(conversationId, title);
  }

  @IpcHandle(IPC.CONVERSATION.ADD_MESSAGE)
  async addMessageToConversation(conversationId: string, message: Omit<Message, 'timestamp'>) {
    return await addMessageToConversation(conversationId, message);
  }

  @IpcHandle(IPC.CONVERSATION.GENERATE_TITLE)
  async generateConversationTitle(conversationId: string, model: string) {
    return await generateConversationTitle(conversationId, model);
  }
}
