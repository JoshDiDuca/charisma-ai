// Main entry point for Ollama services
// Re-exports everything needed by consumers

// Core services
export {
  ollamaURL,
  ollama,
  getOllamaStatus,
  getInstalledModels,
  getAllModels,
  getModelInfo,
  currentlyInstallingModels,
  stopPolling
} from './ollamaService.core';

// Download services
export {
  downloadModel,
  extractOllamaDownloadUrls,
  getUrls
} from './ollamaService.download';

// Chat services
export {
  sendMessage
} from './ollamaService.chat';

// File system services
export {
  getOllamaModelsDir,
  fileExists
} from './ollamaService.fs';

// Re-export types
export type {
  SendMessageRequest
} from './ollamaService.types';
