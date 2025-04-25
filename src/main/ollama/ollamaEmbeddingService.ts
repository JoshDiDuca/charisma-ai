import { ChromaClient, OllamaEmbeddingFunction, IncludeEnum } from 'chromadb'
import { ChatResponse, Ollama, Tool } from 'ollama'
import { v4 as uuidv4 } from 'uuid'
import { ollama, sendMessage } from './ollamaService'

export const OLLAMA_MODEL_EMBEDDING =
  process.env.OLLAMA_EMB_MODEL || 'mxbai-embed-large'
const MIN_SCORE = 0.0001 // Adjust this threshold as needed

const clientChromaDB = new ChromaClient({
  path: process.env.CHROMADB_PATH ?? 'http://localhost:8000',
})
const embedder = new OllamaEmbeddingFunction({
  url: `${process.env.OLLAMA_HOST}/api/embeddings`,
  model: OLLAMA_MODEL_EMBEDDING,
})

const COLLECTION_NAME = 'EMBED-COLLECTION'

function generatePrompt(prompt: string, data: (string | null)[]) {
  return `Context: ${data.join('\n')}\n\nQuestion: ${prompt}`
}

export async function initOllamaEmbedding(documents: string[]) {
  try {
    await deleteCollections()
    const collection = await clientChromaDB.createCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embedder,
    })

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

export async function getOllamaEmbeddingRetrieve(prompt: string) {
  const response = await ollama.embeddings({
    model: OLLAMA_MODEL_EMBEDDING,
    prompt,
  })

  const collection = await clientChromaDB.getCollection({
    name: COLLECTION_NAME,
    embeddingFunction: embedder,
  })

  const results = await collection.query({
    queryEmbeddings: [response.embedding],
    nResults: 100,
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

  return filteredDocs
}

export async function sendMessageWithEmbedding(message: string, model: string) {
  try {
    const embeddings = await getOllamaEmbeddingRetrieve(message)
    if (embeddings.length === 0) {
      return { content: 'No relevant information found' }
    }
    const question = generatePrompt(message, embeddings)
    const response = await sendMessage(question, model, [])
    return {
      ...response,
      content: response.content + JSON.stringify(embeddings),
    }
  } catch (e) {
    console.log(e)
    return { content: 'Error processing request' }
  }
}

export const deleteCollections = async () => {
  const currentCollections = await clientChromaDB.listCollections()
  for (const collection of currentCollections) {
    await clientChromaDB.deleteCollection({ name: collection })
  }
}
