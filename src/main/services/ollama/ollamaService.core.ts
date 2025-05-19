import axios from 'axios';
import { ModelResponse, Ollama } from 'ollama';
import { logError, logInfo } from '../log/logService';
import { fetchOllamaLibraryModels } from './ollamaService.library';
import { OllamaLibraryModel } from 'shared/types/OllamaModel';

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

export const getInstalledModels = async () => {
  try {
    const response = await ollama.list();
    console.log(response)
    return response.models;
  } catch (error) {
    logError(`Failed to get installed models`, { error, category: "Ollama", showUI: true });
    return [];
  }
};

export const getAllModels = async () => {
  const installedList = await getInstalledModels();
  const ollamaLibrary = await fetchOllamaLibraryModels();
  return ollamaLibrary.filter(m => !m.name.toLowerCase().includes("embed")).map(m => {
    console.log(installedList, m.name)
    const installed = installedList.some(installedName => installedName.model.startsWith(m.name));
    const installing = currentlyInstallingModels.has(m.name);

    if (installed && installing) {
      stopPolling(m.name);
      currentlyInstallingModels.delete(m.name);
    }
    const finalInstalling = currentlyInstallingModels.has(m.name);

    return ({ ...m, installed, installing: finalInstalling });
  });

};

export const getModelInfo = async (modelName: string) => {
  const response = await ollama.list();
  return response.models.find((m) => m.name === modelName);
};
