import { getPath } from "../files/fileService.directory";
import * as fs from 'fs';
import { logError } from "../log/logService";
import { Settings } from "shared/types/Settings";
import { ENVIRONMENT } from "shared/constants";
import { ollamaService } from "lib/electron-app/factories/app/setup";

let settingsCache: Settings | null = null;

const defaultSettings: Settings = {
  darkMode: true,
  ignorePaths: [...ENVIRONMENT.DEFAULT_IGNORE_FOLDERS]
};

const updateTrigger: {
  [K in keyof Settings]?: (newSettings: Settings) => Promise<void>
} = {
  ollamaModelsPath: async (_settings: Settings) => {
    ollamaService.restart();
  }
}

export const saveSettings = async (settings: Settings): Promise<Settings> => {
  try {
    const existingSettings = await getSettings();

    const filePath = getPath("Settings", `settings.json`);
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));

    // Update cache
    settingsCache = settings;

    const changedSettings = _getChangedSettings(settings, existingSettings);
    await _runUpdateTriggers(settings, changedSettings);

    return settings;
  } catch (error) {
    logError(`Failed to save settings`, { error, category: "Settings", showUI: true });
    throw error;
  }
};

export const getSettings = async (): Promise<Settings> => {
  try {
    // Check if cache is valid
    if (settingsCache) {
      return settingsCache;
    }

    const filePath = getPath("Settings", `settings.json`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Create default settings and save them
      await saveSettings(defaultSettings);
      return defaultSettings;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const settings = JSON.parse(data) as Settings;

    // Update cache
    settingsCache = settings;

    return settings;
  } catch (error) {
    logError(`Failed to get settings`, { error, category: "Settings", showUI: true });
    // Return default settings on error
    settingsCache = defaultSettings;
    return defaultSettings;
  }
}

const _getChangedSettings = (newSettings: Settings, existingSettings: Settings): (keyof Settings)[] => {
  const changedSettings: (keyof Settings)[] = [];
    for (const key in newSettings) {
      if (newSettings[key as keyof Settings] !== existingSettings[key as keyof Settings]) {
        changedSettings.push(key as keyof Settings);
      }
    }
  return changedSettings;
}

const _runUpdateTriggers = async (settings: Settings, changedSettings: (keyof Settings)[]) => {
    for (const key of changedSettings) {
      if (updateTrigger[key]) {
        await updateTrigger[key](settings);
      }
    }
}
