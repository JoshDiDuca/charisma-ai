import { ChromaClient, IncludeEnum, Metadata } from 'chromadb'
import { v4 as uuidv4 } from 'uuid'
import { ollama, sendMessage } from './ollamaService'
import { readFileSync, statSync } from 'fs'
import { extname } from 'path'
import { embedFolder, recursiveReadDir } from '../fileService'
import {
  createChromaCollection,
  deleteAllChromaCollections,
  getChromaCollection,
  getChromaDocuments,
  getChromaOnlineStatus,
  getOrCreateChromaCollection,
} from '../chroma/chromaService'
import { OllamaModels } from './ollamaCatalog'
import { logError, logInfo, logWarning } from '../log/logService'

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

export async function loadOllamaEmbedding(path: string) {
  const files = await recursiveReadDir(path)
  const collection = await getOrCreateChromaCollection(COLLECTION_NAME)
  const embeddings = files.map((file) => ({
    content: readFileSync(file, 'utf-8'),
    metadata: {
      path: file,
      type: extname(file),
      last_modified: statSync(file).mtime.getTime()
    } as Metadata,
  }))
  await collection.upsert({
    ids: embeddings.map(() => uuidv4()),
    documents: embeddings.map((e) => e.content),
    metadatas: embeddings.map(({ metadata }) => metadata),
  })
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
      await loadOllamaEmbedding(embedFolder)
    }
    const embeddings = await getOllamaEmbeddingRetrieve(message)
    const question = generatePrompt(message, embeddings)
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
