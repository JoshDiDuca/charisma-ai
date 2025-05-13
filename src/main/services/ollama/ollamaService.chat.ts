import { mainWindow } from 'main/windows/main';
import { IPC } from 'shared/constants';
import { logError } from '../log/logService';
import {
  getConversation,
  addMessageToConversation,
  generateConversationTitle
} from './ollamaService.conversation';
import { SendMessageRequest } from './ollamaService.types';
import { ollama } from './ollamaService.core';

export const sendMessage = async ({
  message,
  userMessage,
  sources,
  model,
  tools,
  conversationId,
  systemMessage
}: SendMessageRequest) => {
  try {
    let conversation = await addMessageToConversation(model, conversationId, systemMessage, {
      role: 'user',
      text: message,
      userInput: userMessage || message
    });
    if (!conversation) {
      throw new Error("Failed to retrieve conversation after adding user message");
    }

    const ollamaMessages = conversation.messages.map((msg, index) => ({
      role: msg.role,
      content: index === conversation.messages.length - 1
        ? msg.text
        : (msg.userInput || msg.text),
    }));

    const responseStream = await ollama.chat({
      model,
      messages: ollamaMessages,
      stream: true,
      tools,
    });

    let fullResponse = '';
    for await (const chunk of responseStream) {
      fullResponse += chunk.message.content;
      mainWindow?.webContents.send(IPC.LLM.STREAM_UPDATE, chunk.message.content);
    }

    conversation = await addMessageToConversation(model, conversation.id, systemMessage, {
      role: 'assistant',
      text: fullResponse,
      messageSources: sources
    });

    if (conversation && conversation.messages.length <= 3 && conversation.title.startsWith('Conversation')) {
      await generateConversationTitle(conversation.id, model);
    }

    return await getConversation(conversation.id);
  } catch (error) {
    logError(`Chat error`, { error, category: "Ollama", showUI: true });
    throw error;
  }
};
