import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getSettings } from '../settings/settingsService';
import { isEmpty } from 'lodash';

// Get Ollama models directory based on OS
export const getOllamaModelsDir = async (): Promise<string> => {
  const settings = await getSettings();

  if(settings.ollamaModelsPath && !isEmpty(settings.ollamaModelsPath)) {
    return settings.ollamaModelsPath;
  }

  // Check for environment variable override first
  const envModelDir = process.env.OLLAMA_MODELS;
  if (envModelDir) {
    return path.join(envModelDir, 'models');
  }

  // Use default paths based on OS
  const platform = os.platform();
  const homeDir = os.homedir();

  if (platform === 'darwin') {
    // macOS
    return path.join(homeDir, '.ollama', 'models');
  } else if (platform === 'linux') {
    // Linux
    return path.join('/usr/share/ollama', '.ollama', 'models');
  } else if (platform === 'win32') {
    // Windows
    return path.join(homeDir, '.ollama', 'models');
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
};

// Check if a file exists and get its size
export const fileExists = (filePath: string): { exists: boolean, size?: number } => {
  try {
    const stats = fs.statSync(filePath);
    return { exists: true, size: stats.size };
  } catch (error) {
    return { exists: false };
  }
};

// Ensure directory exists
export const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};
