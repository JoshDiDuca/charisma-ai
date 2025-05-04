import { ChromaClient, IncludeEnum, Metadata, OllamaEmbeddingFunction } from 'chromadb'
import { logInfo, logWarning } from '../log/logService'
import { ResponseSourceDocument } from 'shared/types/Sources/ResponseSourceDocument'

const MIN_SCORE = 0.0001 // Adjust this threshold as needed

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

export const getChromaDocuments = async (collectionName: string, embedding: number[]) => {

  if(await getChromaOnlineStatus()) {
    const collection = await getChromaCollection(collectionName)

    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 5,
      include: [IncludeEnum.Distances, IncludeEnum.Documents, IncludeEnum.Metadatas],
    })

    const scoredDocs =
      results.documents?.[0]?.map((doc, index) => ({
        content: doc,
        score: results.distances?.[0]?.[index] || 1,
        metadata: results.metadatas?.[0]?.[index] || 1,
      } as ResponseSourceDocument)) || []

    const filteredDocs = scoredDocs
      .filter(({ score }) => score >= MIN_SCORE)
      .sort((a, b) => a.score - b.score)

    logInfo(`ChromaDB found ${filteredDocs.length} documents to embed`, { category: "ChromaDB" })
    return filteredDocs;
  } else {
    logWarning(`ChromaDB is not running - not embedding files`, { category: "ChromaDB" })
    return [];
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
    await clientChromaDB.heartbeat()
    return true
  } catch (error) {
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
