import { initializeFileHandler } from './fileHandler'
import { LlmHandlers } from './llm/llmHandler'
import { registerVoiceHandlers } from './llm/voiceHandler';

export const handlers: object[] = [LlmHandlers];

export const initializeHandlers = () => {
  console.log('Registering handles')
  console.log('Registered ' + LlmHandlers.name)
  registerVoiceHandlers()
  initializeFileHandler()
}
