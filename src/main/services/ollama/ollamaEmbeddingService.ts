import { Metadata } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path, { extname } from 'path';
import {
  embedFolder,
  flattenTree,
  readDirectoryNested,
  shouldSkipFile,
  TreeNode,
  readFileByExtension
} from '../files/fileService';
import {
  createChromaCollection,
  deleteAllChromaCollections,
  getChromaDocuments,
  getOrCreateChromaCollection
} from '../chroma/chromaService';
import { ollama, sendMessage } from './ollamaService';
import { OllamaModels } from './ollamaCatalog';
import { logError, logInfo } from '../log/logService';

const OLLAMA_MODEL_EMBEDDING = process.env.OLLAMA_EMB_MODEL || 'mxbai-embed-large';
const COLLECTION_NAME = 'EMBED-COLLECTION';
const BATCH_SIZE = 50;
const CONCURRENT_LIMIT = 50;


function generatePrompt(prompt: string, data: (string | null)[]): string {
  const context = data.filter(item => item !== null).join('\n');
  return `Context: ${context}\n\nQuestion: ${prompt}`;
}

export const getInstalledEmbeddingModels = async (): Promise<string[]> => {
  const response = await ollama.list();
  const installedModels = response.models.map((m) => m.name);
  return installedModels.filter(modelName =>
    OllamaModels.some(baseModel => modelName.startsWith(baseModel.name) && baseModel.type === 'Embedding')
  );
};

export const getAllEmbeddingModels = async () => {
  const response = await ollama.list();
  const installedModelNames = new Set(response.models.map(model => model.name));
  return OllamaModels.filter(m => m.type === 'Embedding')
    .map(m => ({ ...m, installed: installedModelNames.has(m.name) }));
};

export async function initOllamaEmbedding(documents: string[]): Promise<string | undefined> {
  try {
    await deleteAllChromaCollections();
    const collection = await createChromaCollection(COLLECTION_NAME);

    const ids = documents.map(() => uuidv4());
    const metadatas = documents.map((name) => ({ name }));

    await collection.upsert({
      ids,
      documents,
      metadatas,
    });

    return COLLECTION_NAME;
  } catch (e) {
    logError(`Error intialising ollama embedding with chromaDB`, { category: "Ollama", error: e, showUI: true });
    return undefined;
  }
}

export async function loadOllamaEmbedding(embeddingPath: string): Promise<void> {
  logInfo(`loadOllamaEmbedding start for path: ${embeddingPath}`);
  const absoluteStartPath = path.resolve(embeddingPath);
  const collection = await getOrCreateChromaCollection(COLLECTION_NAME);

  const resultsToBatch: Array<{ content: string, metadata: Metadata }> = [];
  let filePaths: TreeNode[] = [];

  try {
      const rootNode = await readDirectoryNested(absoluteStartPath);
      filePaths = flattenTree(rootNode);
  } catch (error) {
      logError(`Failed to read directory structure for ${absoluteStartPath}`, { error, showUI: true });
      return;
  }

  const filesToProcess = filePaths.filter(node => !node.isFolder).map(node => node.path);
  logInfo(`Found ${filesToProcess.length} potential files to process.`);

  const queue = filesToProcess.slice();
  const processPromises: Promise<void>[] = [];

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const filePath = queue.shift();
      if (!filePath) continue;

      try {
        const stats = await fs.promises.stat(filePath);
        if (!(await shouldSkipFile(filePath, stats))) {
          const content = await readFileByExtension(filePath);
          logInfo(`Processed file: ${filePath}
          ${content}}`);
          if (content) {
              resultsToBatch.push({
                  content,
                  metadata: {
                  path: filePath,
                  type: extname(filePath).toLowerCase() || 'unknown',
                  last_modified: stats.mtime.getTime()
                  }
              });
          } else {
              logInfo(`Skipping file due to read error or empty content: ${filePath}`);
          }
        } else {
             logInfo(`Skipping file based on shouldSkipFile: ${filePath}`);
        }
      } catch (error: any) {
         if (error.code === 'ENOENT') {
            logError(`File not found during processing: ${filePath}`, { error: error, category: "Ollama", showUI: false });
        } else {
            logError(`File processing failed: ${filePath}`, { error: error, category: "Ollama", showUI: false });
        }
      }
    }
  };

  const workerCount = Math.min(CONCURRENT_LIMIT, filesToProcess.length);
  for (let i = 0; i < workerCount; i++) {
    processPromises.push(worker());
  }

  await Promise.all(processPromises);

  logInfo(`Processed files, found ${resultsToBatch.length} valid documents for embedding.`);

  if (resultsToBatch.length === 0) {
      logInfo(`No new documents to add to collection ${COLLECTION_NAME}.`);
      logInfo(`loadOllamaEmbedding Done`);
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
      } catch(error) {
          logError(`Failed to upsert batch ${Math.floor(i / BATCH_SIZE) + 1}`, { error, category: "Ollama", showUI: true });
      }
    }
  }

  logInfo(`loadOllamaEmbedding Done`);
}


export async function getOllamaEmbeddingRetrieve(prompt: string): Promise<(string | null)[]> {
  try {
    const response = await ollama.embeddings({
      model: OLLAMA_MODEL_EMBEDDING,
      prompt,
    });

    return getChromaDocuments(COLLECTION_NAME, response.embedding);
  } catch (error) {
    logError(`Error in getting ollama embedding`, { error, category: "Ollama", showUI: true });
    throw error;
  }
}

export async function sendMessageWithEmbedding(message: string, model: string): Promise<{ content: string, [key: string]: any }> {
  try {
    if (embedFolder) {
      logInfo(`Checking for updates in embedding folder: ${embedFolder}`);
      await loadOllamaEmbedding(embedFolder);
    }

    logInfo(`Retrieving relevant documents for prompt.`);
    const embeddings = await getOllamaEmbeddingRetrieve(message);

    const finalPrompt = embeddings.length > 0
      ? generatePrompt(message, embeddings)
      : message;

    if (embeddings.length > 0) {
        logInfo(`Generated prompt with context from ${embeddings.length} documents.`);
    } else {
        logInfo(`No relevant documents found, sending original message.`);
    }

    logInfo(`Sending message to model ${model}.`);
    const response = await sendMessage(finalPrompt, model, []);

    return {
      ...response,
      content: response.content || "",
    };

  } catch (e) {
    logError(`Error sending message with embedding`, { error: e, category: "Ollama", showUI: true });
    return { content: 'Error processing request due to embedding failure.' };
  }
}
