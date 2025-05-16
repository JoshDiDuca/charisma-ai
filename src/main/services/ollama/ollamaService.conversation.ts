// src/main/services/conversationService.ts

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { app } from 'electron';
import { logError, logInfo } from '../log/logService';
import { IPC } from 'shared/constants';
import { ipcMain } from 'electron';
import { mainWindow } from 'main/windows/main';
import { ollama } from './ollamaService.core';
import { Conversation, Message } from 'shared/types/Conversation';
import { Source } from 'shared/types/Sources/Source';
import { ResponseSourceDocument } from 'shared/types/Sources/ResponseSourceDocument';
import { getVectorStorePath } from './ollamaService.embedding';

export const conversationsDir = path.join(app.getPath('userData'), 'conversations');

// Ensure conversations directory exists
if (!fs.existsSync(conversationsDir)) {
  fs.mkdirSync(conversationsDir, { recursive: true });
}

export const saveConversation = async (conversation: Conversation): Promise<Conversation> => {
  try {
    const filePath = path.join(conversationsDir, `${conversation.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
    return conversation;
  } catch (error) {
    logError(`Failed to save conversation`, { error, category: "Conversations", showUI: true });
    throw error;
  }
};

export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  try {
    const filePath = path.join(conversationsDir, `${conversationId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data) as Conversation;
    }
    return null;
  } catch (error) {
    logError(`Failed to get conversation`, { error, category: "Conversations", showUI: true });
    return null;
  }
};

export const getAllConversations = async (): Promise<Conversation[]> => {
  try {
    if (!fs.existsSync(conversationsDir)) {
      return [];
    }

    const files = fs.readdirSync(conversationsDir);
    const conversations: Conversation[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(conversationsDir, file);
        const data = fs.readFileSync(filePath, 'utf8');
        conversations.push(JSON.parse(data) as Conversation);
      }
    }

    // Sort by updatedAt (newest first)
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    logError(`Failed to get all conversations`, { error, category: "Conversations", showUI: true });
    return [];
  }
};

export const deleteConversation = async (conversationId: string): Promise<boolean> => {
  try {
    const filePath = path.join(conversationsDir, `${conversationId}.json`);
    const fileAttachmentsPath = path.join(conversationsDir, `${conversationId}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (fs.existsSync(fileAttachmentsPath)) {
      fs.unlinkSync(fileAttachmentsPath);
    }
    const databaseFolder = getVectorStorePath(conversationId);
    if (fs.existsSync(databaseFolder) && fs.lstatSync(databaseFolder).isDirectory()) {
      fs.rmSync(databaseFolder, { recursive: true, force: true });
    }
      return true;
  } catch (error) {
    logError(`Failed to delete conversation`, { error, category: "Conversations", showUI: true });
    return false;
  }
};

export const createNewConversation = async (
  model: string,
  initialSystemMessage?: string
): Promise<Conversation> => {
  const now = Date.now();
  const conversation: Conversation = {
    id: uuidv4(),
    title: `Conversation ${new Date(now).toLocaleString()}`,
    model,
    sources: [],
    messages: initialSystemMessage
      ? [{ role: 'system', text: initialSystemMessage, timestamp: now }]
      : [],
    createdAt: now,
    updatedAt: now
  };
  logInfo(`Creating new conversation - ${conversation.id}`);

  await saveConversation(conversation);
  return conversation;
};

export const updateConversationTitle = async (
  conversationId: string,
  newTitle: string
): Promise<Conversation | null> => {
  const conversation = await getConversation(conversationId);
  if (!conversation) return null;

  conversation.title = newTitle;
  conversation.updatedAt = Date.now();

  return saveConversation(conversation);
};

export const addMessageToConversation = async (
  model: string,
  conversationId: string | undefined,
  systemMessage: string | undefined,
  message: Omit<Message, 'timestamp'>
): Promise<Conversation> => {
  const conversation = await getOrCreateConversation(model, conversationId, systemMessage);

  const completeMessage: Message = {
    ...message,
    timestamp: Date.now()
  };

  conversation.messages.push(completeMessage);
  conversation.updatedAt = Date.now();

  return saveConversation(conversation);
};

export const addSourcesToConversation = async (
  model: string,
  conversationId: string | undefined,
  systemMessage: string | undefined,
  sources: Source[],
  pendingAttachment?: boolean
): Promise<Conversation> => {
  const conversation = await getOrCreateConversation(model, conversationId, systemMessage);

  const newConversation = {
    ...conversation,
    ...(pendingAttachment ?
      { pendingAttachments: [...conversation.pendingAttachments ?? [], ...sources] } :
      { sources: [...conversation.sources ?? [], ...sources] })
  } as Conversation;

  return saveConversation(newConversation);
};

export const generateConversationTitle = async (
  conversationId: string,
  model: string
): Promise<boolean> => {
  try {
    const conversation = await getConversation(conversationId);
    if (!conversation || !conversation.messages.length) return false;

    // Find first user message
    const userMessage = conversation.messages.find(m => m.role === 'user');
    if (!userMessage) return false;

    const titleResponse = await ollama.chat({
      model,
      messages: [
        { role: 'system', content: 'Generate a very short title (max 6 words) for this conversation based on the user query. Return only the title text with no quotes or additional text.' },
        { role: 'user', content: userMessage.text }
      ],
    });

    if (titleResponse.message?.content) {
      const newTitle = titleResponse.message.content.trim().substring(0, 50);
      await updateConversationTitle(conversation.id, newTitle);
      return true;
    }

    return false;
  } catch (error) {
    logInfo(`Failed to generate conversation title`, { error, category: "Conversations" });
    return false;
  }
};


export const getOrCreateConversation = async ( model: string, conversationId?: string, systemMessage?: string): Promise<Conversation> => {
  try {
    let conversation;

    if (conversationId) {
      conversation = await getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation with ID ${conversationId} not found`);
      }
    } else {
      conversation = await createNewConversation(model, systemMessage);
    }
    // Get updated conversation with the new message
    conversation = await getConversation(conversation.id);
    if (!conversation) {
      throw new Error("Failed to retrieve conversation after adding user message");
    }
    return conversation;
  } catch (error) {
    logInfo(`Failed to get or create conversation`, { error, category: "Conversations" });
    throw error;
  }
}

