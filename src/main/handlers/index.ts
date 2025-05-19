import { logInfo } from 'main/services/log/logService';
import { LlmHandlers } from './llmHandler'
import { SourceHandlers } from './sourceHandler';
import { VoiceHandlers } from './voiceHandler';
import { SettingsHandlers } from './settingsHandler';

export const handlers: object[] = [LlmHandlers, SourceHandlers, VoiceHandlers, SettingsHandlers];

export const initializeHandlers = () => {
  logInfo('Registering handles')
  logInfo('Registered ' + handlers.map((handler: any) => handler.name).join(', '))
}
