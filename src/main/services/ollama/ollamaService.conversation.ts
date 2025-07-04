import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logError, logInfo } from '../log/logService';
import { ollama } from './ollamaService.core';
import { Conversation, Message } from 'shared/types/Conversation';
import { Source } from 'shared/types/Sources/Source';
import { deleteFileOrFolder } from '../files/fileService.delete';
import { getPath } from '../files/fileService.directory';

export const saveConversation = async (conversation: Conversation): Promise<Conversation> => {
  try {
    const filePath = getPath("Conversations", `${conversation.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
    return conversation;
  } catch (error) {
    logError(`Failed to save conversation`, { error, category: "Conversations", showUI: true });
    throw error;
  }
};

export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  try {
    const filePath = getPath("Conversations", `${conversationId}.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as Conversation;
  } catch (error) {
    logError(`Failed to get conversation`, { error, category: "Conversations", showUI: true });
    return null;
  }
};

export const getAllConversations = async (): Promise<Conversation[]> => {
  try {
    const dir = getPath("Conversations")
    const files = fs.readdirSync(dir);
    const conversations: Conversation[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
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
    const filePath =getPath("Conversations", `${conversationId}.json`);
    const fileAttachmentsPath = getPath("Conversations", conversationId);
    const databaseFolder = getPath("DB", conversationId);

    await deleteFileOrFolder(filePath)
    await deleteFileOrFolder(fileAttachmentsPath)
    await deleteFileOrFolder(databaseFolder);
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

