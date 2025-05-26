import { getPath } from "../files/fileService.directory";
import * as fs from 'fs';
import { logError } from "../log/logService";
import { Settings } from "shared/types/Settings";
import { ENVIRONMENT } from "shared/constants";

let settingsCache: Settings | null = null;

const defaultSettings: Settings = {
  darkMode: true,
  ignorePaths: [...ENVIRONMENT.DEFAULT_IGNORE_FOLDERS]
};

export const saveSettings = async (settings: Settings): Promise<Settings> => {
  try {
    const filePath = getPath("Settings", `settings.json`);
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));

    // Update cache
    settingsCache = settings;

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
