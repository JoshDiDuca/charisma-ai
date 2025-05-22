import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document, BaseDocumentTransformer } from "@langchain/core/documents";
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';


export type SearchResult = {
  content: string;
  metadata: Record<string, any>;
  score?: number;
};


// Get or create vector store
export const getVectorStore = async (embeddings: OllamaEmbeddings, dir: string): Promise<HNSWLib> => {
  try {
    return await HNSWLib.load(dir, embeddings);
  } catch (error) {
    const vectorStore = await HNSWLib.fromDocuments(
      [{ pageContent: "", metadata: { initialization: true } }],
      embeddings
    );
    await vectorStore.save(dir);
    return vectorStore;
  }
};

// Add documents to vector store
export const addDocuments = async (
  vectorStore: HNSWLib,
  documents: Document[],
  batchSize = 50
): Promise<void> => {
  if (!documents.length) return;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);

    const docsToAdd: Document<Record<string, any>>[] = [];

    for (const docToProcess of batch) {
      const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 500 });
      const docs = await textSplitter.createDocuments([docToProcess.pageContent], [{ ...docToProcess.metadata }]);
      console.log(`Split ${docs.length}`)
      docsToAdd.push(...docs);
    }

    await vectorStore.addDocuments(docsToAdd);

  }
};

// Search for similar documents
export const searchDocuments = async (
  vectorStore: HNSWLib,
  query: string,
  maxResults = 5
): Promise<SearchResult[]> => {
  const results = await vectorStore.similaritySearch(query, maxResults);

  return results.map(doc => ({
    content: doc.pageContent,
    metadata: doc.metadata
  }));
};
