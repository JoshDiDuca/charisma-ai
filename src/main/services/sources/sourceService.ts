import { DirectorySourceInput,  FilePathSourceInput, FileSourceInput, Source, SourceInput, WebSourceInput } from "shared/types/Sources/Source";
import { addSourcesToConversation, getOrCreateConversation } from "../ollama/ollamaService.conversation";
import { getDirectoryInfo, getFileInfo, getFileTree } from "../files/fileService.read";
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from "shared/types/Conversation";
import fs from "fs";
import path from "path";
import { getPath } from "../files/fileService.directory";

export const addSources = async (
  input: SourceInput[],
  model: string,
  pendingAttachment?: boolean,
  conversationId?: string,
  systemMessage?: string
): Promise<Conversation> => {
  const conversation = await getOrCreateConversation(model, conversationId, systemMessage);

  const sources: Source[] = [];
  for (const sourceInput of input) {
    switch (sourceInput.type) {
      case "Directory":
        sources.push(await getDirectorySource(sourceInput, conversation));
        break;
      case "FilePath":
        sources.push(await getFilePathSource(sourceInput, conversation));
        break;
      case "File":
        sources.push(await getFileSource(sourceInput, conversation));
        break;
      case "Web":
        sources.push(await getWebSource(sourceInput, conversation));
        break;
    }
  }
  return await addSourcesToConversation(model, conversation.id, systemMessage, sources, pendingAttachment);
}

export const getDirectorySource = async (sourceInput: DirectorySourceInput, conversation: Conversation): Promise<Source> => {
  const stats = await getDirectoryInfo(sourceInput.directoryPath);
  const fileTree = await getFileTree(sourceInput.directoryPath)

  return {
    ...sourceInput,
    ...stats,
    fileTree
  } as Source;
}

export const getFileSource = async (sourceInput: FileSourceInput, conversation: Conversation): Promise<Source> => {
  const arrayBuffer = sourceInput.file;
  const buffer = Buffer.from(arrayBuffer);

  const conversationDataPath = getPath("Conversations", `${conversation.id}`);
  const filePath = path.join(conversationDataPath, sourceInput.fileName || `att_${uuidv4()}.${sourceInput.fileType?.replace("/", "") ?? ""}`);
  if (!fs.existsSync(conversationDataPath)) {
    fs.mkdirSync(conversationDataPath, { recursive: true });
  }
  // Write to disk
  await fs.promises.writeFile(filePath, buffer);

  return {
    ...sourceInput,
    savedFilePath: filePath,
    file: undefined
  } as Source;
}

export const getFilePathSource = async (sourceInput: FilePathSourceInput, conversation: Conversation): Promise<Source> => {
  const stats = await getFileInfo(sourceInput.filePath);

  return {
    ...sourceInput,
    ...stats
  } as Source;
}

export const getWebSource = async (sourceInput: WebSourceInput, conversation: Conversation): Promise<Source> => {
  return {
    ...sourceInput
  } as Source;
}
