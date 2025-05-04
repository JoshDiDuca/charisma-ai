import { Source } from "./Sources/SourceInput";

export interface Message {
  role: 'system' | 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  sources: Source[];
  createdAt: number;
  updatedAt: number;
}
