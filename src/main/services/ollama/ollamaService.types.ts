import { Tool } from 'ollama';
import { ResponseSourceDocument } from 'shared/types/Sources/ResponseSourceDocument';

export type SendMessageRequest = {
  message: string;
  userMessage: string;
  sources: ResponseSourceDocument[];
  model: string;
  tools?: Tool[];
  conversationId?: string;
  systemMessage?: string;
}
