import { ChromaClient, OllamaEmbeddingFunction } from 'chromadb'

const clientChromaDB = new ChromaClient({
  path: process.env.CHROMADB_PATH ?? 'http://localhost:8000',
})

export const OLLAMA_MODEL_EMBEDDING =
  process.env.OLLAMA_EMB_MODEL || 'mxbai-embed-large'

const embedder = new OllamaEmbeddingFunction({
  url: `${process.env.OLLAMA_HOST}/api/embeddings`,
  model: OLLAMA_MODEL_EMBEDDING,
})

export async function getChromaStatus() {
  return clientChromaDB.heartbeat()
}

export async function getOrCreateChromaCollection(collectionName: string) {
  try {
    return await clientChromaDB.getCollection({
      name: collectionName,
      embeddingFunction: embedder,
    })
  } catch (error) {
    return await clientChromaDB.getCollection({
      name: collectionName,
      embeddingFunction: embedder,
    })
  }
}
export async function getChromaCollection(collectionName: string) {
  try {
    return await clientChromaDB.getCollection({
      name: collectionName,
      embeddingFunction: embedder,
    })
  } catch (error) {
    throw error
  }
}

export async function createChromaCollection(collectionName: string) {
  try {
    return await clientChromaDB.createCollection({
      name: collectionName,
      embeddingFunction: embedder,
    })
  } catch (error) {
    throw error
  }
}
export async function getChromaOnlineStatus(): Promise<boolean> {
  try {
    // The heartbeat method returns a nanosecond timestamp if successful[4].
    // We just need to know if the call succeeds without throwing an error.
    await clientChromaDB.heartbeat()
    return true // If the call succeeds, the server is running and reachable.
  } catch (error) {
    // If the call fails (e.g., connection refused, timeout), the server is likely not running or unreachable.
    console.error('ChromaDB heartbeat failed:', error)
    return false
  }
}

export async function resetChromaCollection(collectionName: string) {
  try {
    await clientChromaDB.deleteCollection({ name: collectionName })
    return { success: true }
  } catch (error: any) {
    // Ignore if collection doesn't exist
    if (error.message?.includes('does not exist')) {
      return { success: true }
    }
    throw error
  }
}

export const deleteAllChromaCollections = async () => {
  const currentCollections = await clientChromaDB.listCollections()
  for (const collection of currentCollections) {
    await clientChromaDB.deleteCollection({ name: collection })
  }
}
