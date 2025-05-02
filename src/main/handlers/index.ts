import { logInfo } from 'main/services/log/logService';
import { LlmHandlers } from './llm/llmHandler'
import { FileHandlers } from './fileHandler';
import { VoiceHandlers } from './llm/voiceHandler';

export const handlers: object[] = [LlmHandlers, FileHandlers, VoiceHandlers];

export const initializeHandlers = () => {
  logInfo('Registering handles')
  logInfo('Registered ' + handlers.map((handler: any) => handler.name).join(', '))
}
