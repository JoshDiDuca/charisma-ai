import axios from 'axios';
import { Ollama } from 'ollama';
import { OllamaModels } from './ollamaCatalog';
import { logError, logInfo } from '../log/logService';

export const currentlyInstallingModels: Set<string> = new Set();
export const modelPollIntervals: Map<string, NodeJS.Timeout> = new Map();

export const ollamaURL = process.env.OLLAMA_API_BASE || 'http://localhost:11434';
export const ollama = new Ollama({ host: ollamaURL });

export const stopPolling = (modelName: string) => {
  if (modelPollIntervals.has(modelName)) {
    clearInterval(modelPollIntervals.get(modelName)!);
    modelPollIntervals.delete(modelName);
    logInfo(`[Polling] Stopped polling for ${modelName}`, { category: "Ollama" });
  }
  currentlyInstallingModels.delete(modelName);
};

export const getOllamaStatus = async (): Promise<boolean> => {
  try {
    const appStatus = await axios.get(ollamaURL);
    return appStatus.data === 'Ollama is running';
  } catch (err) {
    return false;
  }
};

export const getInstalledModels = async (): Promise<string[]> => {
  try {
    const response = await ollama.list();
    return response.models
      .map((m) => m.name)
      .filter(modelName =>
        OllamaModels.some(catalogModel => modelName.startsWith(catalogModel.name))
      );
  } catch (error) {
    logError(`Failed to get installed models`, { error, category: "Ollama", showUI: true });
    return [];
  }
};

export const getAllModels = async () => {
  try {
    const installedList = await getInstalledModels();
    return OllamaModels.filter(m => m.type === 'LLM').map(m => {
      const installed = installedList.some(installedName => installedName.startsWith(m.name));
      const installing = currentlyInstallingModels.has(m.name);

      if (installed && installing) {
        stopPolling(m.name);
        currentlyInstallingModels.delete(m.name);
      }
      const finalInstalling = currentlyInstallingModels.has(m.name);

      return ({ ...m, installed, installing: finalInstalling });
    });
  } catch (error) {
    logError(`Failed to get all models state`, { error, category: "Ollama", showUI: true });
    return OllamaModels.filter(m => m.type === 'LLM').map(m => ({ ...m, installed: false, installing: false }));
  }
};

export const getModelInfo = async (modelName: string) => {
  const response = await ollama.list();
  return response.models.find((m) => m.name === modelName);
};
