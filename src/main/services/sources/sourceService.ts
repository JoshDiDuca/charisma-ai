import { DirectorySourceInput,  FileSourceInput, Source, SourceInput, WebSourceInput } from "shared/types/Sources/Source";
import { addSourcesToConversation } from "../ollama/ollamaConversationService";
import { getDirectoryInfo, getFileInfo, getFileTree } from "../files/fileService";
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
  const stats = await getDirectoryInfo(sourceInput.directoryPath);
  const fileTree = await getFileTree(sourceInput.directoryPath)

  return {
    ...sourceInput,
    ...stats
  } as Source;
}

export const getFileSource = async (sourceInput: FileSourceInput): Promise<Source> => {
  const stats = await getFileInfo(sourceInput.filePath);

  return {
    ...sourceInput,
    ...stats
  } as Source;
}

export const getWebSource = async (sourceInput: WebSourceInput): Promise<Source> => {
  return {
    ...sourceInput
  } as Source;
}
