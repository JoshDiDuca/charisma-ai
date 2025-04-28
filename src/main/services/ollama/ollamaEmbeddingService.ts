import { Embedding, Metadata } from 'chromadb'
import { v4 as uuidv4 } from 'uuid'
import { ollama, sendMessage } from './ollamaService'
import fs from 'fs'
import path, { extname } from 'path'
import { embedFolder, flattenTree, isTextFile, readDirectoryNested, readFileInChunks, shouldSkipFile, } from '../files/fileService'
import { createChromaCollection, deleteAllChromaCollections, getChromaDocuments, getOrCreateChromaCollection } from '../chroma/chromaService'
import { OllamaModels } from './ollamaCatalog'
import { logError, logInfo } from '../log/logService'

const OLLAMA_MODEL_EMBEDDING =
  process.env.OLLAMA_EMB_MODEL || 'mxbai-embed-large'

const COLLECTION_NAME = 'EMBED-COLLECTION'

function generatePrompt(prompt: string, data: (string | null)[]) {
  return `Context: ${data.join('\n')}\n\nQuestion: ${prompt}`
}

export const getInstalledEmbeddingModels = async () => {
  const response = await ollama.list()
  return response.models.map((m) => m.name).filter(model =>
    OllamaModels.some(baseName => model.startsWith(baseName.name))
  );
}

export const getAllEmbeddingModels = async () => {
  const response = await ollama.list();
  return OllamaModels.filter(m => m.type === 'Embedding')
    .map(m => ({ ...m, installed: response.models.some(model => model.name === m.name) }));
}

export async function initOllamaEmbedding(documents: string[]) {
  try {
    await deleteAllChromaCollections()

    const collection = await createChromaCollection(COLLECTION_NAME)

    await collection.upsert({
      ids: documents.map(() => uuidv4()),
      documents,
      metadatas: documents.map((name) => ({ name })),
    })

    return COLLECTION_NAME
  } catch (e) {
    logError(`Error intialising ollama embedding with chromaDB`, { category: "Ollama", error: e, showUI: true });
  }
}
export async function loadOllamaEmbedding(embeddingPath: string) {
  logInfo(`loadOllamaEmbedding start`);
  const absoluteStartPath = path.resolve(embeddingPath);
  const collection = await getOrCreateChromaCollection(COLLECTION_NAME);

  const BATCH_SIZE = 15;
  const CONCURRENT_LIMIT = 30;
  let batch: Array<{content: string, metadata: Metadata}> = [];
  let activePromises = 0;

  const processBatch = async () => {
    if (batch.length === 0) return;

    await collection.upsert({
      ids: batch.map(() => uuidv4()),
      documents: batch.map(e => e.content),
      metadatas: batch.map(e => e.metadata),
    });
    batch = [];
  };

  const children = await readDirectoryNested(absoluteStartPath);
  const files = flattenTree(children)
    .filter(file => !file.isFolder && isTextFile(file.path))
    .map(file => file.path);

  const processFile = async (file: string) => {
    try {
      const stats = await fs.promises.stat(file);
      if (shouldSkipFile(file, stats)) return;

      const content = await readFileInChunks(file);

      batch.push({
        content,
        metadata: {
          path: file,
          type: extname(file),
          last_modified: stats.mtime.getTime()
        }
      });

      if (batch.length >= BATCH_SIZE) {
        await processBatch();
      }
    } catch (error) {
      logError('File processing failed: ' + file, { error });
    }
  };

  // Concurrent processing with pool management
  const queue = files.slice();
  while (queue.length > 0) {
    if (activePromises < CONCURRENT_LIMIT) {
      activePromises++;
      const file = queue.shift()!;
      processFile(file).finally(() => activePromises--);
    } else {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // Wait for remaining promises
  while (activePromises > 0) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  await processBatch();
  logInfo(`loadOllamaEmbedding Done`);
}


export async function getOllamaEmbeddingRetrieve(prompt: string) {
  try {
    const response = await ollama.embeddings({
      model: OLLAMA_MODEL_EMBEDDING,
      prompt,
    })

    return getChromaDocuments(COLLECTION_NAME, response.embedding);
  } catch (error) {
    logError(`Error in getting ollama embedding`, { error, category: "Ollama", showUI: true })
    throw error
  }
}

export async function sendMessageWithEmbedding(message: string, model: string) {
  try {
    if (embedFolder) {
      logInfo(`Loding ollama embedding` + embedFolder);
      await loadOllamaEmbedding(embedFolder)
    }
    logInfo(`getOllamaEmbeddingRetrieve`);
    const embeddings = await getOllamaEmbeddingRetrieve(message)
    logInfo(`generatePrompt`);
    const question = generatePrompt(message, embeddings)
    logInfo(`sendMessage`);
    const response = await sendMessage((embeddings.length === 0) ? message : question, model, [])
    return {
      ...response,
      content: response.content,
    }
  } catch (e) {
    logError(`Sending message with embedding`, { error: e, category: "Ollama", showUI: true })
    return { content: 'Error processing request' }
  }
}
