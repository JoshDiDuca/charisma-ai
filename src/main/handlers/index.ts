import { logInfo } from 'main/services/log/logService';
import { LlmHandlers } from './llm/llmHandler'
import { FileHandlers } from './fileHandler';
import { VoiceHandlers } from './llm/voiceHandler';
import { WebHandlers } from './llm/webHandler';

export const handlers: object[] = [LlmHandlers, FileHandlers, VoiceHandlers, WebHandlers];

export const initializeHandlers = () => {
  logInfo('Registering handles')
  logInfo('Registered ' + handlers.map((handler: any) => handler.name).join(', '))
}
