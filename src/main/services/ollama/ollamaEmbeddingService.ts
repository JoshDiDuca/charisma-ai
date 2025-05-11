import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import {
  flattenTree,
  shouldSkipFile,
  TreeNode,
  readFileByExtension,
  getFileInfo,
} from '../files/fileService';
import * as cheerio from 'cheerio';
import {
  currentlyInstallingModels,
  ollama,
  sendMessage,
  stopPolling,
} from './ollamaService';
import { OllamaModels } from './ollamaCatalog';
import { logError, logInfo } from '../log/logService';
import { getOrCreateConversation } from './ollamaConversationService';
import { Source, WebSourceInput } from 'shared/types/Sources/Source';
import axios from 'axios';
import { ResponseSourceDocument } from 'shared/types/Sources/ResponseSourceDocument';

const OLLAMA_MODEL_EMBEDDING = process.env.OLLAMA_EMB_MODEL || 'mxbai-embed-large';
const STORAGE_PATH = "./vectorstore";
const BATCH_SIZE = 50;
const CONCURRENT_LIMIT = 50;

let vectorStore: HNSWLib;

function generatePrompt(prompt: string, data: ResponseSourceDocument[]): string {
  const context = data.map(d => d.content).filter(Boolean).join('\n');
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

async function initializeVectorStore() {
  const embeddings = new OllamaEmbeddings({
    model: OLLAMA_MODEL_EMBEDDING,
    baseUrl: "http://localhost:11434"
  });

  try {
    vectorStore = await HNSWLib.load(STORAGE_PATH, embeddings);
    logInfo("Loaded existing vector store");
  } catch (e) {
    logInfo("Creating new vector store");
    vectorStore = await HNSWLib.fromDocuments([], embeddings);
    await vectorStore.save(STORAGE_PATH);
  }
}

export async function initOllamaEmbedding(documents: string[]): Promise<void> {
  await initializeVectorStore();
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
  const resultsToBatch: Array<{ content: string; metadata: any }> = [];
  const filesToProcess = filePaths.filter(node => !node.isFolder).map(node => node.path);

  logInfo(`Found ${filesToProcess.length} potential files to process.`);

  const queue = [...filesToProcess];
  const processFile = async (filePath: string) => {
    try {
      const stats = await fs.promises.stat(filePath);
      if (!(await shouldSkipFile(filePath, stats))) {
        const content = await readFileByExtension(filePath);
        const fileInfo = await getFileInfo(filePath, stats);
        if (content) {
          logInfo(`Processed file: ${filePath}`);
          resultsToBatch.push({
            content,
            metadata: {
              path: filePath,
              ...fileInfo,
              lastModified: fileInfo.lastModified.getTime(),
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
    logInfo(`No new documents to add to collection ${STORAGE_PATH}.`);
    logInfo('loadOllamaEmbedding Done');
    return;
  }

  logInfo(`Upserting ${resultsToBatch.length} documents into ${STORAGE_PATH} in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < resultsToBatch.length; i += BATCH_SIZE) {
    const batch = resultsToBatch.slice(i, i + BATCH_SIZE);
    if (batch.length > 0) {
      try {
        await vectorStore.addDocuments(batch.map(b => ({ id: uuidv4(), pageContent: b.content, metadata: b.metadata })));
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

  await vectorStore.save(STORAGE_PATH);
}

export async function loadOllamaWebEmbedding(source: WebSourceInput): Promise<void> {
  try {

    const response = await axios.get(source.url);
    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, noscript, iframe, link, meta, [hidden], path, svg, g, rect, img, audio, video, canvas').remove();

    const propsToRemove: string[] = ["src", "class", "style"];
    // Optionally, remove comments
    $('*').contents().each(function() {
      if (this.type === 'comment')
        $(this).remove();
      for (const propToRemove of propsToRemove) {
        if($(this).attr(propToRemove))
          $(this).removeAttr(propToRemove);
      }
    });

    // Extract cleaned HTML
    const cleanedHtml = $.html() || '';

    const toProcess = {
      content: cleanedHtml,
      metadata: {
        type: 'text/html',
        last_modified: Date.now(),
        ...source
      },
    };

    await vectorStore.addDocuments([{
      id: uuidv4(),
      pageContent: `
        ${JSON.stringify(source)}
        ${toProcess.content}
      `,
      metadata: toProcess.metadata
    }]);

  await vectorStore.save(STORAGE_PATH);

    logInfo(`Processed web page: ${source.url}`);
    // console.log(cleanedHtml);


  } catch (error: any) {
    logError(`Failed to fetch web content from ${source.url}`, {
      error,
      category: 'Ollama',
      showUI: true,
    });
  }
}

export async function getOllamaEmbeddingRetrieve(prompt: string) {
  const results = await vectorStore.similaritySearch(prompt, 5);
  return results.map(doc => ({
    content: doc.pageContent,
    metadata: doc.metadata,
    score: 0
  }));
}

export async function sendMessageWithEmbedding(
  message: string,
  model: string,
  conversationId?: string
) {
  try {
    const conversation = await getOrCreateConversation(model, conversationId);
    await loadOllamaEmbedding(conversation.sources);

    logInfo('Retrieving relevant documents for prompt.');
    const sources = await getOllamaEmbeddingRetrieve(message);

    const finalPrompt =
      sources.length > 0 ? generatePrompt(message, sources) : message;

    logInfo(
      sources.length > 0
        ? `Generated prompt with context from ${sources.length} documents.`
        : 'No relevant documents found, sending original message.'
    );

    logInfo(`Sending message to model ${model}.`);
    const response = await sendMessage({
      conversationId: conversation.id,
      message: finalPrompt,
      userMessage: message,
      model,
      sources
    });
    console.log(response);

    return response;
  } catch (e) {
    logError('Error sending message with embedding', {
      error: e,
      category: 'Ollama',
      showUI: true,
    });
    return { content: 'Error processing request due to embedding failure.' };
  }
}
