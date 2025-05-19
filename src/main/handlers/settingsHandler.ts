import { IpcHandle } from '../decorators/IpcHandle'
import { IPC } from 'shared/constants'
import { getSettings, saveSettings } from 'main/services/settings/settingsService'
import type { Settings } from 'shared/types/Settings'

export class SettingsHandlers {
  @IpcHandle(IPC.SETTINGS.GET_SETTINGS)
  async getSettings() {
    return await getSettings()
  }
  @IpcHandle(IPC.SETTINGS.SAVE_SETTINGS)
  async saveSettings(settings: Settings) {
    return await saveSettings(settings)
  }
}
