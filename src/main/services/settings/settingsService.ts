import { getPath } from "../files/fileService.directory";
import * as fs from 'fs';
import { logError } from "../log/logService";
import { Settings } from "shared/types/Settings";

export const saveSettings = async (settings: Settings): Promise<Settings> => {
  try {
    const filePath = getPath("Settings", `settings.json`);
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
    return settings;
  } catch (error) {
    logError(`Failed to save settings`, { error, category: "Settings", showUI: true });
    throw error;
  }
};

export const getSettings = async (): Promise<Settings | null> => {
  try {
    const filePath = getPath("Settings",  `settings.json`);
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as Settings;
  } catch (error) {
    logError(`Failed to get conversation`, { error, category: "Settings", showUI: true });
    return null;
  }
};
