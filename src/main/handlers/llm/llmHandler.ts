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
import { IPC } from 'shared/constants'
import { addMessageToConversation, createNewConversation, deleteConversation, generateConversationTitle, getAllConversations, getConversation, updateConversationTitle } from 'main/services/ollama/ollamaConversationService'
import { Message } from 'shared/types/Conversation'

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

  @IpcHandle(IPC.LLM.GET_STATUS)
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
  async sendMessageWithEmbedding(message: string, model: string, conversationId: string | undefined) {
    return sendMessageWithEmbedding(message, model, conversationId)
  }

}
// Register IPC handlers for conversation management
export const registerConversationHandlers = () => {
  ipcMain.handle(IPC.CONVERSATION.GET_ALL, async () => {
    return await getAllConversations();
  });

  ipcMain.handle(IPC.CONVERSATION.GET, async (_, conversationId: string) => {
    return await getConversation(conversationId);
  });

  ipcMain.handle(IPC.CONVERSATION.DELETE, async (_, conversationId: string) => {
    return await deleteConversation(conversationId);
  });

  ipcMain.handle(IPC.CONVERSATION.CREATE, async (_, model: string, systemMessage?: string) => {
    return await createNewConversation(model, systemMessage);
  });

  ipcMain.handle(IPC.CONVERSATION.UPDATE_TITLE, async (_, conversationId: string, title: string) => {
    return await updateConversationTitle(conversationId, title);
  });

  ipcMain.handle(IPC.CONVERSATION.ADD_MESSAGE, async (_, conversationId: string, message: Omit<Message, 'timestamp'>) => {
    return await addMessageToConversation(conversationId, message);
  });

  ipcMain.handle(IPC.CONVERSATION.GENERATE_TITLE, async (_, conversationId: string, model: string) => {
    return await generateConversationTitle(conversationId, model);
  });
};
