import * as fs from 'fs';
import * as path from 'path';
import { mainWindow } from 'main/windows/main';
import { IPC } from 'shared/constants';
import { logError, logInfo } from '../log/logService';
import {
  getOllamaModelsDir,
  fileExists
} from './ollamaService.fs';
import {
  getInstalledModels,
  getAllModels,
  currentlyInstallingModels,
  modelPollIntervals
} from './ollamaService.core';
import { OllamaExtraction, OllamaModelDownloadProgress, OllamaUrls } from 'shared/types/OllamaModel';


const getUrls = async (baseUrl: string, manifestUrl: string) => {
  try {
    const response = await fetch(manifestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch manifest data');
    }

    const manifestData = await response.json();

    const urls = {
      manifest: manifestUrl,
      manifestResponse: manifestData,
      config: baseUrl + manifestData.config.digest,
      layers: manifestData.layers.map((layer: any) => ({
        url: baseUrl + layer.digest,
        size: layer.size,
        mediaType: layer.mediaType,
        filename: layer.digest.replace(":", "-")
      })),
      configFilename: manifestData.config.digest.replace(":", "-")
    };

    return urls;
  } catch (error) {
    throw new Error(`Error fetching model data: ${error}`);
  }
}

const extractOllamaDownloadUrls = async (modelInput: string): Promise<OllamaExtraction> => {
  // Convert input to model name and tag
  const inputSplit = modelInput.trim().split(':');
  if (inputSplit.length !== 2) {
    throw new Error('Invalid input format. Please use the format "model:tag"');
  }

  const modelName = inputSplit[0];
  const tag = inputSplit[1];
  const manifestUrl = `https://registry.ollama.ai/v2/library/${modelName}/manifests/${tag}`;
  const baseUrl = `https://registry.ollama.ai/v2/library/${modelName}/blobs/`;

  const urls = await getUrls(baseUrl, manifestUrl);

  return {
    modelName,
    tag,
    manifestUrl,
    baseUrl,
    ...urls
  };
}

const sendDownloadProgress = (progress: OllamaModelDownloadProgress) => {
  logInfo(`[Download Progress] Model: ${progress.model}, Status: ${progress.status}, Progress: ${progress.progress.toFixed(2)}%`, {

    logToConsole: false,
    category: "Ollama"
  });

  mainWindow?.webContents.send(IPC.LLM.DOWNLOAD_MODEL_PROGRESS, progress);
};

export const stopPolling = (modelName: string) => {
  if (modelPollIntervals.has(modelName)) {
    clearInterval(modelPollIntervals.get(modelName)!);
    modelPollIntervals.delete(modelName);
    logInfo(`[Polling] Stopped polling for ${modelName}`, { category: "Ollama", logToConsole: false });
  }
  currentlyInstallingModels.delete(modelName);
};

// Download file with progress tracking
const downloadFileWithProgress = async (
  url: string,
  outputPath: string,
  modelName: string,
  size: number,
  onProgress: (downloaded: number) => void
): Promise<void> => {
  try {
    // Make sure the directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const fileStream = fs.createWriteStream(outputPath);

    let downloadedBytes = 0;

    // Process the stream
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        fileStream.end();
        break;
      }

      // Write chunk to file
      fileStream.write(Buffer.from(value));

      // Update progress
      downloadedBytes += value.length;
      onProgress(downloadedBytes);
    }

    return new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Error downloading file: ${error}`);
  }
};

export const downloadModel = async (modelName: string) => {
  try {
    const installedList = await getInstalledModels();

    // Check if model is already installed
    if (installedList.some(installedName => installedName.name.startsWith(modelName))) {
      currentlyInstallingModels.delete(modelName);
      stopPolling(modelName);
      await getAllModels(); // Update model list in UI
      return { status: 'already_installed' };
    }

    // Check if download is already in progress
    if (currentlyInstallingModels.has(modelName)) {
      return { status: 'download_in_progress' };
    }

    // Mark model as currently installing
    currentlyInstallingModels.add(modelName);

    try {
      // Extract model details
      const modelData = await extractOllamaDownloadUrls(modelName);
      const modelsDir = await getOllamaModelsDir();

      // Get actual config size from manifest data directly
      const configSize = 0; // Will be updated after manifest fetch


      // Get the actual config size from the manifest
      const actualConfigSize = modelData.manifestResponse?.config?.size || 512;
      const totalBytes = modelData.layers.reduce((acc, layer) => acc + layer.size, actualConfigSize);
      let downloadedBytes = 0;

      // Send initial progress update
      sendDownloadProgress({
        model: modelName,
        status: 'starting',
        progress: 0,
        downloadedBytes: 0,
        totalBytes
      });

      // Create the model directory structure
      const modelBlobsDir = path.join(modelsDir, 'blobs');
      if (!fs.existsSync(modelBlobsDir)) {
        fs.mkdirSync(modelBlobsDir, { recursive: true });
      }

      // Create the proper manifest directory structure for Ollama
      // Path should be: models/manifests/registry.ollama.ai/library/modelName
      const modelManifestDir = path.join(
        modelsDir,
        'manifests',
        'registry.ollama.ai',
        'library',
        modelData.modelName
      );

      if (!fs.existsSync(modelManifestDir)) {
        fs.mkdirSync(modelManifestDir, { recursive: true });
      }

      // First download all blobs to ensure they exist before creating the manifest

      // Download config file
      const configPath = path.join(modelBlobsDir, modelData.configFilename);
      await downloadFileWithProgress(
        modelData.config,
        configPath,
        modelName,
        actualConfigSize,
        (downloadedChunkSize) => {
          downloadedBytes += downloadedChunkSize;
          const progress = (downloadedBytes / totalBytes) * 100;
          sendDownloadProgress({
            model: modelName,
            status: 'downloading',
            progress,
            downloadedBytes,
            totalBytes,
            currentFile: 'config'
          });
        }
      );

      // Download each layer
      const totalLayers = modelData.layers.length;
      for (let i = 0; i < totalLayers; i++) {
        const layer = modelData.layers[i];
        const layerPath = path.join(modelBlobsDir, layer.filename);

        // Check if layer already exists with correct size
        const fileInfo = fileExists(layerPath);
        if (fileInfo.exists && fileInfo.size === layer.size) {
          // Layer already exists, add to progress
          downloadedBytes += layer.size;
          const progress = (downloadedBytes / totalBytes) * 100;

          sendDownloadProgress({
            model: modelName,
            status: 'downloading',
            progress,
            downloadedBytes,
            totalBytes,
            currentFile: `layer ${i + 1}/${totalLayers} (already exists)`
          });
          continue;
        }

        // Download layer and track progress
        let layerDownloaded = 0;
        await downloadFileWithProgress(
          layer.url,
          layerPath,
          modelName,
          layer.size,
          (downloadedChunkSize) => {
            const chunkDiff = downloadedChunkSize - layerDownloaded;
            layerDownloaded = downloadedChunkSize;
            downloadedBytes += chunkDiff;

            const progress = (downloadedBytes / totalBytes) * 100;
            sendDownloadProgress({
              model: modelName,
              status: 'downloading',
              progress,
              downloadedBytes,
              totalBytes,
              currentFile: `layer ${i + 1}/${totalLayers}`
            });
          }
        );
      }

      // Only save the manifest after all blobs are successfully downloaded
      // Save manifest using the tag as the filename (or 'latest' if it's the default tag)
      const manifestFileName = modelData.tag || 'latest';
      const manifestPath = path.join(modelManifestDir, manifestFileName);
      fs.writeFileSync(manifestPath, JSON.stringify(modelData.manifestResponse, null, 2));

      // Download complete
      sendDownloadProgress({
        model: modelName,
        status: 'complete',
        progress: 100,
        downloadedBytes: totalBytes,
        totalBytes
      });

      // Clean up
      currentlyInstallingModels.delete(modelName);

      // Refresh model list in UI
      mainWindow?.webContents.send(IPC.LLM.UPDATE_ALL_MODELS, await getAllModels());

      return { status: 'download_complete' };
    } catch (error) {
      logError(`Failed to download model: ${modelName}`, { error, category: "Ollama", showUI: true });

      // Send error status
      sendDownloadProgress({
        model: modelName,
        status: 'error',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        error: error instanceof Error ? error.message : String(error)
      });

      // Clean up
      currentlyInstallingModels.delete(modelName);

      // Refresh model list in UI
      mainWindow?.webContents.send(IPC.LLM.UPDATE_ALL_MODELS, await getAllModels());

      return { status: 'download_error', error };
    }
  } catch (error) {
    logError(`Failed to process download request for model: ${modelName}`, { error, category: "Ollama", showUI: true });
    return { status: 'download_error', error };
  }
};
