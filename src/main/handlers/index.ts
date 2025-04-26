import { initializeFileHandler } from './fileHandler'
import { LlmHandlers } from './llm/llmHandler'

export const initializeHandlers = () => {
  console.log('Registering handles')
  console.log('Registered ' + LlmHandlers.name)
  initializeFileHandler()
}
