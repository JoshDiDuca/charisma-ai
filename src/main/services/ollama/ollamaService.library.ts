import cheerio from 'cheerio';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { OllamaLibraryModel } from 'shared/types/OllamaModel';
import { getPath } from '../files/fileService.directory';

interface CacheData {
  timestamp: number;
  data: OllamaLibraryModel[];
}


export const SupportedOllamaEmbedddingModels = [
  {
    name: 'mxbai-embed-large:latest',
    type: "Embedding"
  },
  {
    name: 'nomic-embed-text:latest',
    type: "Embedding"
  }
]



const cacheFilePath = getPath("ModelsCache", 'ollama_models_cache.json');
const CACHE_EXPIRATION = 60 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Save models data to cache file
 */
export const saveModelsCache = (data: OllamaLibraryModel[]): void => {
  try {
    const cacheData: CacheData = {
      timestamp: Date.now(),
      data,
    };
    fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.error('Failed to save Ollama models cache:', error);
  }
};

/**
 * Load models from cache if available and not expired
 */
export const loadModelsCache = (bypassDate?: boolean): OllamaLibraryModel[] | null => {
  try {
    if (!fs.existsSync(cacheFilePath)) {
      return null;
    }
    const cacheContent = fs.readFileSync(cacheFilePath, 'utf-8');
    const cacheData: CacheData = JSON.parse(cacheContent);

    // Return null if cache expired
    if (bypassDate !== true && Date.now() - cacheData.timestamp > CACHE_EXPIRATION) {
      return null;
    }
    return cacheData.data;
  } catch (error) {
    console.error('Failed to load Ollama models cache:', error);
    return null;
  }
};

/**
 * Fetch Ollama library models with caching
 */
export const fetchOllamaLibraryModels = async (): Promise<OllamaLibraryModel[]> => {
  try {
    // Try to load from cache first
    const cachedModels = loadModelsCache();
    if (cachedModels) {
      return cachedModels;
    }

    // If no valid cache, fetch from web
    const response = await fetch('https://ollama.com/library');
    const html = await response.text();

    const $ = cheerio.load(html);
    const models: OllamaLibraryModel[] = [];

    $('li[x-test-model]').each((_, element) => {
      const name = $(element).find('div[x-test-model-title]').attr('title') || '';
      const url = $(element).find('a').attr('href') || '';
      const description = $(element).find('div[x-test-model-title] p').text().trim() ||
                         $(element).find('p.max-w-lg').text().trim() || '';
      const size = $(element).find('span[x-test-size]').text().trim() || '';
      const pullCount = $(element).find('span[x-test-pull-count]').text().trim() || '';
      const tagCount = $(element).find('span[x-test-tag-count]').text().trim() || '';
      const lastUpdated = $(element).find('span[x-test-updated]').text().trim() || '';

      models.push({
        name: `${name}:latest`,
        url,
        description,
        size,
        pullCount,
        tagCount,
        lastUpdated
      });
    });

    // Save to cache
    saveModelsCache(models);

    return models;
  } catch (error) {
    console.error('Error fetching Ollama library models:', error);
    return loadModelsCache(true) ?? [];
  }
};
