import { v4 as uuidv4 } from 'uuid';
import fs, { existsSync, mkdirSync } from 'fs';
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import {
  flattenTree,
  shouldSkipFile,
  TreeNode,
  readFileByExtension,
  getFileInfo,
} from '../files/fileService.read';
import * as cheerio from 'cheerio';
import { logError, logInfo } from '../log/logService';
import { getOrCreateConversation } from './ollamaService.conversation';
import { Source, WebSourceInput } from 'shared/types/Sources/Source';
import axios from 'axios';
import { ResponseSourceDocument } from 'shared/types/Sources/ResponseSourceDocument';
import { app } from 'electron';
import path from 'path';
import { currentlyInstallingModels, ollama, stopPolling } from './ollamaService.core';
import { sendMessage } from './ollamaService';
import { isNil } from 'lodash';
import { fetchOllamaLibraryModels, SupportedOllamaEmbedddingModels } from './ollamaService.library';

const STORAGE_PATH = path.join(app.getPath('userData'), 'DB');

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

const BATCH_SIZE = 50;
const CONCURRENT_LIMIT = 50;

async function generatePrompt(prompt: string, data: ResponseSourceDocument[], attachments?: Source[]): Promise<string> {
  const messageParts: string[] = [];
  if (data.length > 0) {
    const context = data.map(d => d.content).filter(Boolean).join('\n');
    messageParts.push(`Context: ${context}`)
  }

  messageParts.push(`Question: ${prompt}`)

  if (attachments && attachments.length > 0) {
    const attachmentText: string[] = [];
    for (const attachment of attachments) {
      switch (attachment.type) {
        case "File":
          if (!await shouldSkipFile(attachment.savedFilePath)) {
            const text = await readFileByExtension(attachment.savedFilePath);
            if (text) {
              attachmentText.push(text);
            }
          }
          break;
      }
    }
    if (attachmentText.length) {
      messageParts.push(`ATTACHED: ${attachmentText.join(`\n`)}`)
    }
  }

  return messageParts.join(`\n`);
}

export const getInstalledEmbeddingModels = async () => {
  const response = await ollama.list();
  const installedModels = response.models;
  return installedModels.filter(m => m.name.toLowerCase().includes("embed"))
};

export const getAllEmbeddingModels = async () => {
  const installedList = await getInstalledEmbeddingModels();

  // No point calling ollama library here as only two I've found are supported by most models

  return SupportedOllamaEmbedddingModels.map(m => {
    const installed = installedList.some(installedName => installedName.name.startsWith(m.name));
    const installing = currentlyInstallingModels.has(m.name);

    if (installed && installing) {
      stopPolling(m.name);
      currentlyInstallingModels.delete(m.name);
    }
    return { ...m, installed, installing: currentlyInstallingModels.has(m.name) };
  });
};


export const getVectorStorePath = (conversationId?: string) => {
  const conversationVectoreStore = conversationId ? path.join(STORAGE_PATH, conversationId) : STORAGE_PATH;
  return conversationVectoreStore;
}
async function initializeVectorStore(embeddingModel: string, conversationId?: string) {
  const conversationVectoreStore = getVectorStorePath(conversationId);

  const embeddings = new OllamaEmbeddings({
    model: embeddingModel,
    baseUrl: "http://localhost:11434"
  });

  try {
    if (!existsSync(conversationVectoreStore)) {
      mkdirSync(conversationVectoreStore, { recursive: true });
    }
  } catch (error) {
    logError(`There was an error creating vector DB storage directory: ${conversationVectoreStore}`)
  }

  try {
    let vectorStore: HNSWLib = await HNSWLib.load(conversationVectoreStore, embeddings);
    logInfo("Loaded existing vector store");
    return vectorStore;
  } catch (e) {
    logInfo("Creating new vector store");
    let vectorStore: HNSWLib = await HNSWLib.fromDocuments([
      {
        pageContent: "Initialization document",
        metadata: { initialization: true }
      }
    ], embeddings);
    await vectorStore.save(conversationVectoreStore);
    return vectorStore;
  }
}

export async function loadOllamaEmbedding(sources: Source[], vectorStore: HNSWLib): Promise<void> {
  for (const source of sources) {
    if (source.type === 'Directory') {
      const filePaths = flattenTree(source.fileTree?.children ?? []);
      await loadOllamaFileEmbedding(filePaths, vectorStore);
    }
    if (source.type === 'Web') {
      await loadOllamaWebEmbedding(source as WebSourceInput, vectorStore);
    }
  }
}

export async function loadOllamaFileEmbedding(filePaths: TreeNode[], vectorStore: HNSWLib): Promise<void> {
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

export async function loadOllamaWebEmbedding(source: WebSourceInput, vectorStore: HNSWLib): Promise<void> {
  try {

    const response = await axios.get(source.url);
    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, noscript, iframe, link, meta, [hidden], path, svg, g, rect, img, audio, video, canvas').remove();

    const propsToRemove: string[] = ["src", "class", "style"];
    // Optionally, remove comments
    $('*').contents().each(function () {
      if (this.type === 'comment')
        $(this).remove();
      for (const propToRemove of propsToRemove) {
        if ($(this).attr(propToRemove))
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

export async function getOllamaEmbeddingRetrieve(prompt: string, vectorStore: HNSWLib) {
  const results = await vectorStore.similaritySearch(prompt, 5);
  return results.map(doc => ({
    content: doc.pageContent,
    metadata: doc.metadata,
    score: 0
  }));
}

interface EmbeddingSource {
  content: string;
  metadata: Record<string, any>;
  score: number;
}

export async function getEmbeddingSources(
  message: string,
  embeddingModel: string,
  conversationId: string,
  conversationSources: any[]
): Promise<EmbeddingSource[]> {
  const vectorStore = await initializeVectorStore(embeddingModel, conversationId);

  await loadOllamaEmbedding(conversationSources, vectorStore);
  logInfo('Retrieving relevant documents for prompt.');

  return await getOllamaEmbeddingRetrieve(message, vectorStore);
}

export async function sendMessageWithEmbedding(
  message: string,
  model: string,
  embeddingModel?: string,
  conversationId?: string
) {
  try {
    const conversation = await getOrCreateConversation(model, conversationId);
    const sources: EmbeddingSource[] = [];

    // Check if we need to use embeddings
    if (conversation.sources.length > 0 || (conversation.pendingAttachments?.length || 0) > 0) {
      if (isNil(embeddingModel)) {
        throw new Error("No embedding model selected");
      }

      // Get relevant sources using embeddings
      const retrievedSources = await getEmbeddingSources(
        message,
        embeddingModel,
        conversation.id,
        conversation.sources
      );
      sources.push(...retrievedSources);

      logInfo(`Generated prompt with context from ${sources.length} documents.`);
    } else {
      logInfo('No sources available for embedding, sending original message.');
    }

    const finalPrompt = await generatePrompt(message, sources, conversation.pendingAttachments);

    // Send the message
    logInfo(`Sending message to model ${model}.`);
    const response = await sendMessage({
      conversationId: conversation.id,
      message: finalPrompt,
      userMessage: message,
      model,
      sources
    });

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
