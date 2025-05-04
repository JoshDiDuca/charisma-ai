import { DirectorySourceInput,  FileSourceInput, Source, SourceInput, WebSourceInput } from "shared/types/Sources/SourceInput";
import { addSourcesToConversation, getOrCreateConversation } from "../ollama/ollamaConversationService";
import { getFileTree, readDirectoryNested } from "../files/fileService";
import fs from 'fs';
import path from "path";
import { Conversation } from "shared/types/Conversation";

export const addSources = async (
  input: SourceInput[],
  model: string,
  conversationId: string | undefined,
  systemMessage: string | undefined
): Promise<Conversation> => {
  const sources: Source[] = [];
  for (const sourceInput of input) {
    switch (sourceInput.type) {
      case "Directory":
        sources.push(await getDirectorySource(sourceInput));
        break;
      case "File":
        sources.push(await getFileSource(sourceInput));
        break;
      case "Web":
        sources.push(await getWebSource(sourceInput));
    }
  }
  const conversation = await addSourcesToConversation(model, conversationId, systemMessage, sources);
  return conversation;
}

export const getDirectorySource = async (sourceInput: DirectorySourceInput): Promise<Source> => {
  const stats = await fs.promises.stat(sourceInput.directoryPath);
  const fileTree = await getFileTree(sourceInput.directoryPath)

  return {
    ...sourceInput,
    fileTree,
    directoryName: path.dirname(sourceInput.directoryPath),
    directoryPath: sourceInput.directoryPath,
    lastModified: stats.mtime,
    directorySize: stats.size,
  } as Source;
}

export const getFileSource = async (sourceInput: FileSourceInput): Promise<Source> => {
  const stats = await fs.promises.stat(sourceInput.filePath);

  return {
    ...sourceInput,
    filePath: sourceInput.filePath,
    fileName: path.basename(sourceInput.filePath),
    fileSize: stats.size,
    fileType: path.extname(sourceInput.filePath),
    lastModified: stats.mtime,
    fileNameWithoutExtension: path.basename(sourceInput.filePath, path.extname(sourceInput.filePath))
  } as Source;
}

export const getWebSource = async (sourceInput: WebSourceInput): Promise<Source> => {
  return {
    ...sourceInput
  } as Source;
}
