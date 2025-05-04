import { Metadata } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { extname } from 'path';
import {
  flattenTree,
  shouldSkipFile,
  TreeNode,
  readFileByExtension,
} from '../files/fileService';
import {
  createChromaCollection,
  deleteAllChromaCollections,
  getChromaDocuments,
  getOrCreateChromaCollection,
} from '../chroma/chromaService';
import {
  currentlyInstallingModels,
  ollama,
  sendMessage,
  stopPolling,
} from './ollamaService';
import { OllamaModels } from './ollamaCatalog';
import { logError, logInfo } from '../log/logService';
import { getOrCreateConversation } from './ollamaConversationService';
import { FileSourceInput, Source, WebSourceInput } from 'shared/types/Sources/SourceInput';
import axios from 'axios';

const OLLAMA_MODEL_EMBEDDING = process.env.OLLAMA_EMB_MODEL || 'mxbai-embed-large';
const COLLECTION_NAME = 'EMBED-COLLECTION';
const BATCH_SIZE = 50;
const CONCURRENT_LIMIT = 50;

function generatePrompt(prompt: string, data: (string | null)[]): string {
  const context = data.filter(Boolean).join('\n');
  return `Context: ${context}\n\nQuestion: ${prompt}`;
}

export const getInstalledEmbeddingModels = async (): Promise<string[]> => {
  const response = await ollama.list();
  const installedModels = response.models.map(m => m.name);
  return installedModels.filter(modelName =>
    OllamaModels.some(
      baseModel => modelName.startsWith(baseModel.name) && baseModel.type === 'Embedding'
    )
  );
};

export const getAllEmbeddingModels = async () => {
  const installedList = await getInstalledEmbeddingModels();
  return OllamaModels.filter(m => m.type === 'Embedding').map(m => {
    const installed = installedList.some(installedName => installedName.startsWith(m.name));
    const installing = currentlyInstallingModels.has(m.name);

    if (installed && installing) {
      stopPolling(m.name);
      currentlyInstallingModels.delete(m.name);
    }
    return { ...m, installed, installing: currentlyInstallingModels.has(m.name) };
  });
};

export async function initOllamaEmbedding(documents: string[]): Promise<string | undefined> {
  try {
    await deleteAllChromaCollections();
    const collection = await createChromaCollection(COLLECTION_NAME);
    const ids = documents.map(() => uuidv4());
    const metadatas = documents.map(name => ({ name }));

    await collection.upsert({ ids, documents, metadatas });
    return COLLECTION_NAME;
  } catch (e) {
    logError('Error initializing ollama embedding with chromaDB', {
      category: 'Ollama',
      error: e,
      showUI: true,
    });
    return undefined;
  }
}

export async function loadOllamaEmbedding(sources: Source[]): Promise<void> {
  for (const source of sources) {
    if (source.type === 'Directory') {
      const filePaths = flattenTree(source.fileTree?.children ?? []);
      await loadOllamaFileEmbedding(filePaths);
    }
    if (source.type === 'Web') {
      await loadOllamaWebEmbedding(source as WebSourceInput);
    }
  }
}

export async function loadOllamaFileEmbedding(filePaths: TreeNode[]): Promise<void> {
  const collection = await getOrCreateChromaCollection(COLLECTION_NAME);
  const resultsToBatch: Array<{ content: string; metadata: Metadata }> = [];

  const filesToProcess = filePaths.filter(node => !node.isFolder).map(node => node.path);
  logInfo(`Found ${filesToProcess.length} potential files to process.`);

  const queue = [...filesToProcess];
  const processFile = async (filePath: string) => {
    try {
      const stats = await fs.promises.stat(filePath);
      if (!(await shouldSkipFile(filePath, stats))) {
        const content = await readFileByExtension(filePath);
        if (content) {
          logInfo(`Processed file: ${filePath}`);
          resultsToBatch.push({
            content,
            metadata: {
              path: filePath,
              type: extname(filePath).toLowerCase() || 'unknown',
              last_modified: stats.mtime.getTime(),
            },
          });
        } else {
          logInfo(`Skipping file due to read error or empty content: ${filePath}`);
        }
      } else {
        logInfo(`Skipping file based on shouldSkipFile: ${filePath}`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logError(`File not found during processing: ${filePath}`, {
          error,
          category: 'Ollama',
          showUI: false,
        });
      } else {
        logError(`File processing failed: ${filePath}`, {
          error,
          category: 'Ollama',
          showUI: false,
        });
      }
    }
  };

  const worker = async () => {
    while (queue.length > 0) {
      const filePath = queue.shift();
      if (filePath) await processFile(filePath);
    }
  };

  const workerCount = Math.min(CONCURRENT_LIMIT, filesToProcess.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  logInfo(`Processed files, found ${resultsToBatch.length} valid documents for embedding.`);

  if (resultsToBatch.length === 0) {
    logInfo(`No new documents to add to collection ${COLLECTION_NAME}.`);
    logInfo('loadOllamaEmbedding Done');
    return;
  }

  logInfo(`Upserting ${resultsToBatch.length} documents into ${COLLECTION_NAME} in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < resultsToBatch.length; i += BATCH_SIZE) {
    const batch = resultsToBatch.slice(i, i + BATCH_SIZE);
    if (batch.length > 0) {
      try {
        await collection.upsert({
          ids: batch.map(() => uuidv4()),
          documents: batch.map(e => e.content),
          metadatas: batch.map(e => e.metadata),
        });
        logInfo(`Upserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} documents)`);
      } catch (error) {
        logError(`Failed to upsert batch ${Math.floor(i / BATCH_SIZE) + 1}`, {
          error,
          category: 'Ollama',
          showUI: true,
        });
      }
    }
  }
}
export async function loadOllamaWebEmbedding(source: WebSourceInput): Promise<void> {
  try {
    const collection = await getOrCreateChromaCollection(COLLECTION_NAME);

    const response = await axios.get(source.url);
    const toProcess = ({
      content: response.data,
      metadata: {
        url: source.url,
        type: 'text/html',
        last_modified: Date.now(),
      },
    });
    await collection.upsert({
      ids: uuidv4(),
      documents: toProcess.content,
      metadatas: toProcess.metadata,
    });
    logInfo(`Processed web page: ${source.url}`);
    console.log(`${response.data}`);

  } catch (error: any) {
    logError(`Failed to fetch web content from ${source.url}`, {
      error,
      category: 'Ollama',
      showUI: true,
    });
  }
}


export async function getOllamaEmbeddingRetrieve(prompt: string): Promise<(string | null)[]> {
  try {
    const response = await ollama.embeddings({
      model: OLLAMA_MODEL_EMBEDDING,
      prompt,
    });
    return getChromaDocuments(COLLECTION_NAME, response.embedding);
  } catch (error) {
    logError('Error in getting ollama embedding', {
      error,
      category: 'Ollama',
      showUI: true,
    });
    throw error;
  }
}

export async function sendMessageWithEmbedding(
  message: string,
  model: string,
  conversationId?: string
): Promise<{ content: string;[key: string]: any }> {
  try {
    const conversation = await getOrCreateConversation(model, conversationId);
    await loadOllamaEmbedding(conversation.sources);

    logInfo('Retrieving relevant documents for prompt.');
    const embeddings = await getOllamaEmbeddingRetrieve(message);

    const finalPrompt =
      embeddings.length > 0 ? generatePrompt(message, embeddings) : message;

    logInfo(
      embeddings.length > 0
        ? `Generated prompt with context from ${embeddings.length} documents.`
        : 'No relevant documents found, sending original message.'
    );

    logInfo(`Sending message to model ${model}.`);
    const response = await sendMessage(finalPrompt, model, [], conversationId);
    console.log(response);

    return {
      ...response,
      content: response.content || '',
    };
  } catch (e) {
    logError('Error sending message with embedding', {
      error: e,
      category: 'Ollama',
      showUI: true,
    });
    return { content: 'Error processing request due to embedding failure.' };
  }
}
