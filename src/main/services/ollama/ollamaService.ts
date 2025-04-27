import axios from 'axios';
import { mainWindow } from 'main/windows/main';
import { Ollama, Tool } from 'ollama';
import { OllamaModels } from './ollamaCatalog';
import { OllamaModel } from 'shared/types/OllamaModel';
import { ipcMain } from 'electron';

const modelPollIntervals: Map<string, NodeJS.Timeout> = new Map();
const currentlyInstallingModels: Set<string> = new Set();

export const ollamaURL = process.env.OLLAMA_API_BASE || 'http://localhost:11434';
export const ollama = new Ollama({ host: ollamaURL });

const sendDownloadProgress = async (modelName: string, status: string, error?: any) => {
  console.log(`[Download Progress] Model: ${modelName}, Status: ${status}`, error || '');
  mainWindow?.webContents.send('update-all-models', await getAllModels());
};

const stopPolling = (modelName: string) => {
  if (modelPollIntervals.has(modelName)) {
    clearInterval(modelPollIntervals.get(modelName)!);
    modelPollIntervals.delete(modelName);
    console.log(`[Polling] Stopped polling for ${modelName}`);
  }
  currentlyInstallingModels.delete(modelName);
};

export const getOllamaStatus = async (): Promise<boolean> => {
  try {
    const appStatus = await axios.get(ollamaURL);
    return appStatus.data === 'Ollama is running';
  } catch (err) {
    console.warn('Ollama status check failed:', err);
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
        console.error("Failed to get installed models:", error);
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
    console.error("Failed to get all models state:", error);
    return OllamaModels.filter(m => m.type === 'LLM').map(m => ({ ...m, installed: false, installing: false }));
  }
};

export const downloadModel = async (modelName: string) => {
  const installedList = await getInstalledModels();

  if (installedList.some(installedName => installedName.startsWith(modelName))) {
    console.log(`Model ${modelName} is already installed.`);
    currentlyInstallingModels.delete(modelName);
    stopPolling(modelName);
    return { status: 'already_installed' };
  }

  if (currentlyInstallingModels.has(modelName) || modelPollIntervals.has(modelName)) {
    console.log(`Model ${modelName} download is already in progress.`);
    await sendDownloadProgress(modelName, 'downloading');
    return { status: 'download_in_progress' };
  }

  console.log(`Starting download process for ${modelName}...`);
  currentlyInstallingModels.add(modelName);
  await sendDownloadProgress(modelName, 'started');

  const pullPromise = ollama.pull({
    model: modelName,
    stream: false,
  });

  const intervalId = setInterval(async () => {
    console.log(`[Polling] Checking status for ${modelName}...`);
    try {
      const currentInstalled = await getInstalledModels();
      if (currentInstalled.some(installedName => installedName.startsWith(modelName))) {
        console.log(`[Polling] Model ${modelName} confirmed installed.`);
        stopPolling(modelName);
        await sendDownloadProgress(modelName, 'complete');
      } else {
        await sendDownloadProgress(modelName, 'downloading');
      }
    } catch (error) {
      console.error(`[Polling] Error checking status for ${modelName}:`, error);
      await sendDownloadProgress(modelName, 'checking_error', error);
    }
  }, 5000);

  modelPollIntervals.set(modelName, intervalId);
  console.log(`[Polling] Started polling for ${modelName} with interval ID ${intervalId}`);

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
      mainWindow?.webContents.send('stream-update', chunk.message.content)
    }

    return {
      status: 'complete',
      content: fullResponse,
    }
  } catch (error) {
    console.error('Chat error:', error)
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
