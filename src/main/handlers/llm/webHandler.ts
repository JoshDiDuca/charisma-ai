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
import { searchGoogle } from 'main/services/web/googleSevice'

export class WebHandlers {
  @IpcHandle(IPC.WEB.QUERY)
  async searchQuery(query: string) {
    return searchGoogle(query)
  }

}
