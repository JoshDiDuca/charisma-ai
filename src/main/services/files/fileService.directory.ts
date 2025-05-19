import { app } from 'electron';
import fs from 'fs';
import path from 'path';

enum DirectoryPaths {
  ModelsCache = "models-cache",
  GithubCache = "github-cache",
  DB = "DB",
  OllamaBin = "ollama-bin",
  PiperBin = "piper-bin",
  Conversations = "conversations",
  Settings = "settings"
}

type DirectoryPathKeys = keyof typeof DirectoryPaths;

export const getBaseDataDirectory = () => app.getPath('userData');

function hasFileExtension(p: string) {
  return path.extname(p) !== '';
}

export const getPath = (type: DirectoryPathKeys, ...paths: (string | undefined)[]) => {
  const pathsToUse = paths.filter(Boolean) as string[];
  let dir = path.join(getBaseDataDirectory(), DirectoryPaths[type], ...pathsToUse);

  // If the last segment looks like a file, only create up to its parent directory
  if (paths.length && hasFileExtension(pathsToUse[pathsToUse.length - 1])) {
    const baseDir = path.dirname(dir);

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  }
  return path.join(getBaseDataDirectory(), DirectoryPaths[type], ...pathsToUse);
}
