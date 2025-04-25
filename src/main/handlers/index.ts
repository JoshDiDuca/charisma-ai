import { initializeFileHandler } from './fileHandler'
import { initializeLLMHandlers } from './llm/llmHandler'

export const initializeHandlers = () => {
  console.log('Registering handles')
  initializeLLMHandlers()
  initializeFileHandler()
}
