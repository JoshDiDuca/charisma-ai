import { ResponseSourceDocument } from "./Sources/ResponseSourceDocument";
import { Source } from "./Sources/Source";

export interface Message {
  role: 'system' | 'user' | 'assistant';
  messageSources?: ResponseSourceDocument[];
  text: string;
  userInput?: string;
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
