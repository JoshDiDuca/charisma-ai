import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OllamaEmbeddings } from "@langchain/ollama";
import * as os from 'os';
import {
  flattenTree,
  shouldSkipFile,
  readFileByExtension,
  getFileInfo,
} from '../files/fileService.read';
import * as cheerio from 'cheerio';
import { logError, logInfo } from '../log/logService';
import { getOrCreateConversation } from './ollamaService.conversation';
import { Source, WebSourceInput } from 'shared/types/Sources/Source';
import axios from 'axios';
import { ResponseSourceDocument } from 'shared/types/Sources/ResponseSourceDocument';
import { currentlyInstallingModels, ollama, stopPolling } from './ollamaService.core';
import { sendMessage } from './ollamaService';
import { isNil } from 'lodash';
import { SupportedOllamaEmbedddingModels } from './ollamaService.library';
import { getPath } from '../files/fileService.directory';
import { Conversation } from 'shared/types/Conversation';
import { addDocuments, getVectorStore } from '../hnswService';

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

export async function getOrCreateVectorStore(embeddingModel: string, conversation: Conversation) {
  const conversationVectoreStore = getPath("DB", conversation.id);

  const embeddings = new OllamaEmbeddings({
    model: embeddingModel,
    baseUrl: "http://localhost:11434"
  });

  return getVectorStore(embeddings, conversationVectoreStore);
}

export async function loadOllamaEmbedding(sources: Source[], embeddingModel: string, conversation: Conversation): Promise<void> {
  const vectorStore = await getOrCreateVectorStore(embeddingModel, conversation);

  for (const source of sources) {
    if (source.type === 'Directory') {
      const filePaths = flattenTree(source.fileTree?.children ?? []);
      await loadOllamaPathEmbedding(filePaths.filter(node => !node.isFolder).map(node => node.path), conversation, vectorStore);
    }
    if (source.type === 'File') {
      await loadOllamaPathEmbedding([source.savedFilePath], conversation, vectorStore);
    }
    if (source.type === 'FilePath') {
      await loadOllamaPathEmbedding([source.filePath], conversation, vectorStore);
    }
    if (source.type === 'Web') {
      await loadOllamaWebEmbedding(source as WebSourceInput, conversation, vectorStore);
    }
  }
}

export async function loadOllamaPathEmbedding(filePaths: string[], conversation: Conversation, vectorStore: HNSWLib): Promise<void> {
  const CONCURRENCY_LIMIT = Math.min(CONCURRENT_LIMIT, os.cpus().length - 2);
  let processedCount = 0;
  let addedCount = 0;

  logInfo(`Found ${filePaths.length} potential files to process.`);

  const processAndAddFile = async (filePath: string, index: number) => {
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.size === 0 || stats.size > 10_000_000) {
        logInfo(`Skipping file (size): ${filePath}`);
        return;
      }

      if (!(await shouldSkipFile(filePath, stats))) {
        const content = await readFileByExtension(filePath);
        if (!content) {
          logInfo(`Skipping file (no content): ${filePath}`);
          return;
        }
          logInfo(`Processing file for embedding: ${filePath}`);

        const fileInfo = await getFileInfo(filePath, stats);
        const document = {
          id: uuidv4(),
          pageContent: content,
          metadata: {
            path: filePath,
            ...fileInfo,
            lastModified: fileInfo.lastModified.getTime(),
          },
        };

        // Add document immediately to vector store
        await addDocuments(vectorStore, [document]);
        addedCount++;
        logInfo(`Processed and added: ${filePath} (${index + 1}/${filePaths.length})`);
      } else {
        logInfo(`Skipping file (shouldSkipFile): ${filePath}`);
      }
    } catch (error: any) {
      logError(`File processing failed: ${filePath}`, {
        error,
        category: 'Ollama',
        showUI: false
      });
    } finally {
      processedCount++;
    }
  };

  // Process with controlled concurrency
  const semaphore = Array(CONCURRENCY_LIMIT).fill(Promise.resolve());

  const allPromises = filePaths.map(async (filePath, index) => {
    await semaphore[index % CONCURRENCY_LIMIT];
    semaphore[index % CONCURRENCY_LIMIT] = processAndAddFile(filePath, index);
    return semaphore[index % CONCURRENCY_LIMIT];
  });

  await Promise.all(allPromises);

  if (addedCount === 0) {
    logInfo(`No new documents to add to collection.`);
  } else {
    logInfo(`Added ${addedCount} documents to vector store.`);
  }

  await vectorStore.save(getPath("DB", conversation.id));
  logInfo('loadOllamaEmbedding Done');
}


export async function loadOllamaWebEmbedding(source: WebSourceInput, conversation: Conversation, vectorStore: HNSWLib): Promise<void> {
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

    await addDocuments(vectorStore, [{
      id: uuidv4(),
      pageContent: `
        ${JSON.stringify(source)}
        ${toProcess.content}
      `,
      metadata: toProcess.metadata
    }]);

    await vectorStore.save(getPath("DB", conversation.id));

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
  conversation: Conversation,
): Promise<EmbeddingSource[]> {
  const vectorStore = await getOrCreateVectorStore(embeddingModel, conversation);
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
        conversation
      );

      sources.push(...retrievedSources);

      logInfo(`Generated prompt with context from ${sources.length} documents.`, { error: JSON.stringify(sources) });
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
