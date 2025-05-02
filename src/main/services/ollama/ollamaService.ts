import axios from 'axios';
import { mainWindow } from 'main/windows/main';
import { Ollama, Tool } from 'ollama';
import { OllamaModels } from './ollamaCatalog';
import { IPC } from 'shared/constants';
import { logError, logInfo } from '../log/logService';

const modelPollIntervals: Map<string, NodeJS.Timeout> = new Map();
export const currentlyInstallingModels: Set<string> = new Set();

export const ollamaURL = process.env.OLLAMA_API_BASE || 'http://localhost:11434';
export const ollama = new Ollama({ host: ollamaURL });

const sendDownloadProgress = async (modelName: string, status: string, error?: any) => {
  logInfo(`[Download Progress] Model: ${modelName}, Status: ${status}`, { error, category: "Ollama" });
  mainWindow?.webContents.send(IPC.LLM.UPDATE_ALL_MODELS, await getAllModels());
};

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

export const downloadModel = async (modelName: string) => {
  const installedList = await getInstalledModels();

  if (installedList.some(installedName => installedName.startsWith(modelName))) {
    currentlyInstallingModels.delete(modelName);
    stopPolling(modelName);
    return { status: 'already_installed' };
  }

  if (currentlyInstallingModels.has(modelName) || modelPollIntervals.has(modelName)) {
    await sendDownloadProgress(modelName, 'downloading');
    return { status: 'download_in_progress' };
  }

  currentlyInstallingModels.add(modelName);
  await sendDownloadProgress(modelName, 'started');

  const pullPromise = ollama.pull({
    model: modelName,
    stream: false,
  });

  const intervalId = setInterval(async () => {
    try {
      const currentInstalled = await getInstalledModels();
      if (currentInstalled.some(installedName => installedName.startsWith(modelName))) {
        stopPolling(modelName);
        await sendDownloadProgress(modelName, 'complete');
      } else {
        await sendDownloadProgress(modelName, 'downloading');
      }
    } catch (error) {
      logError(`Error checking model status`, { error, category: "Ollama", showUI: true })
      await sendDownloadProgress(modelName, 'checking_error', error);
    }
  }, 10000);

  modelPollIntervals.set(modelName, intervalId);
  return { status: 'download_started' };
};


export const sendMessage = async (
  message: string,
  model: string,
  tools: Tool[],
  systemMessage?: string
) => {
  try {
    const responseStream = await ollama.chat({
      model,
      messages: [
        ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
        { role: 'user', content: message },
      ],
      stream: true,
      tools,
    })

    let fullResponse = ''
    for await (const chunk of responseStream) {
      fullResponse += chunk.message.content
      mainWindow?.webContents.send(IPC.LLM.STREAM_UPDATE, chunk.message.content)
    }

    return {
      status: 'complete',
      content: fullResponse,
    }
  } catch (error) {
    logError(`Chat error`, { error, category: "Ollama", showUI: true })
    return {
      status: 'error',
      error: error,
    }
  }
}
export const getModelInfo = async (modelName: string) => {
  const response = await ollama.list()
  return response.models.find((m) => m.name === modelName)
}
