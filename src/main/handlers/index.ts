import { logInfo } from 'main/services/log/logService';
import { LlmHandlers } from './llmHandler'
import { SourceHandlers } from './sourceHandler';
import { VoiceHandlers } from './voiceHandler';

export const handlers: object[] = [LlmHandlers, SourceHandlers, VoiceHandlers];

export const initializeHandlers = () => {
  logInfo('Registering handles')
  logInfo('Registered ' + handlers.map((handler: any) => handler.name).join(', '))
}
