import { logInfo } from 'main/services/log/logService';
import { initializeFileHandler } from './fileHandler'
import { LlmHandlers } from './llm/llmHandler'
import { registerVoiceHandlers } from './llm/voiceHandler';

export const handlers: object[] = [LlmHandlers];

export const initializeHandlers = () => {
  logInfo('Registering handles')
  logInfo('Registered ' + LlmHandlers.name)
  registerVoiceHandlers()
  initializeFileHandler()
}
