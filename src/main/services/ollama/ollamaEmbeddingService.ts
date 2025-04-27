import { ChromaClient, IncludeEnum } from 'chromadb'
import { v4 as uuidv4 } from 'uuid'
import { ollama, sendMessage } from './ollamaService'
import { readFileSync, statSync } from 'fs'
import { extname } from 'path'
import { embedFolder, recursiveReadDir } from '../fileService'
import {
  createChromaCollection,
  deleteAllChromaCollections,
  getChromaCollection,
  getOrCreateChromaCollection,
} from '../chroma/chromaService'
import { OllamaModels } from './ollamaCatalog'

const MIN_SCORE = 0.0001 // Adjust this threshold as needed

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
  return OllamaModels.filter(m => m.type === 'Embedding').map(m => ({ ...m, installed: response.models.some(model => model.name === m.name) }));
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
    console.log(e)
  }
}

export async function loadOllamaEmbedding(path: string) {
  console.warn('Loading files ' + path)
  const files = await recursiveReadDir(path)
  const collection = await getOrCreateChromaCollection(COLLECTION_NAME)
  const embeddings = files.map((file) => ({
    content: readFileSync(file, 'utf-8'),
    metadata: {
      path: file,
      type: extname(file),
      last_modified: statSync(file).mtime.getTime(),
    },
  }))
  console.warn('Loaded files ' + path)
  await collection.upsert({
    ids: embeddings.map(() => uuidv4()),
    documents: embeddings.map((e) => e.content),
    metadatas: embeddings.map(({ metadata }) => metadata),
  })
  console.warn('Loaded files into DB ' + path)
}

export async function getOllamaEmbeddingRetrieve(prompt: string) {
  try {
    const response = await ollama.embeddings({
      model: OLLAMA_MODEL_EMBEDDING,
      prompt,
    })

    const collection = await getChromaCollection(COLLECTION_NAME)

    const results = await collection.query({
      queryEmbeddings: [response.embedding],
      nResults: 5,
      include: [IncludeEnum.Distances, IncludeEnum.Documents],
    })

    const scoredDocs =
      results.documents?.[0]?.map((doc, index) => ({
        content: doc,
        score: results.distances?.[0]?.[index] || 1,
      })) || []
    console.error(scoredDocs)

    const filteredDocs = scoredDocs
      .filter(({ score }) => score >= MIN_SCORE)
      .sort((a, b) => a.score - b.score)
      .map((d) => d.content ?? '' + d.score)

    console.log(filteredDocs)

    return filteredDocs
  } catch (error) {
    console.error(error)
    throw error
  }
}

export async function sendMessageWithEmbedding(message: string, model: string) {
  try {
    if (embedFolder) {
      await loadOllamaEmbedding(embedFolder)
    }
    console.log('Prompt ' + message)
    const embeddings = await getOllamaEmbeddingRetrieve(message)
    console.log('Prompt ' + embeddings.length)
    if (embeddings.length === 0) {
      return { content: 'No relevant information found' }
    }
    const question = generatePrompt(message, embeddings)
    const response = await sendMessage(question, model, [])
    return {
      ...response,
      content: response.content,
    }
  } catch (e) {
    console.log(e)
    return { content: 'Error processing request' }
  }
}
