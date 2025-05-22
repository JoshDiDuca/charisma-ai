import { isNil } from 'lodash';
import path from 'node:path';
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { IPC } from 'shared/constants';
import { AppStatus } from 'shared/types/AppStatus';
import { Conversation, Message } from 'shared/types/Conversation';
import { OllamaLibraryModel, OllamaModelDownloadProgress } from 'shared/types/OllamaModel';
import { SourceInput } from 'shared/types/Sources/Source';
import { WebSearch } from 'shared/types/Sources/WebSearch';

const { App } = window;

type ChatMessage = Message & {
  incomplete?: boolean;
}


interface ChatBotContextType {
  conversation?: Conversation;
  setConversation: React.Dispatch<React.SetStateAction<Conversation | undefined>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  model?: string;
  setModel: React.Dispatch<React.SetStateAction<string | undefined>>;
  embeddingModel?: string;
  setEmbeddingModel: React.Dispatch<React.SetStateAction<string | undefined>>;
  voiceModel?: string;
  setVoiceModel: React.Dispatch<React.SetStateAction<string | undefined>>;


  // Data
  conversations?: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[] | undefined>>;

  availableModels: OllamaLibraryModel[];
  setAvailableModels: React.Dispatch<React.SetStateAction<OllamaLibraryModel[] | undefined>>;

  availableVoiceModels: OllamaLibraryModel[];
  setAvailableVoiceModels: React.Dispatch<React.SetStateAction<OllamaLibraryModel[] | undefined>>;
  availableEmbeddingModels: OllamaLibraryModel[];
  setAvailableEmbeddingModels: React.Dispatch<React.SetStateAction<OllamaLibraryModel[] | undefined>>;

  status: AppStatus | string;
  setStatus: React.Dispatch<React.SetStateAction<AppStatus | string>>;

  //Download
  downloadModel: (modelName: string, type: "LLM" | "Embedding") => Promise<void>;

  //Sources
  handleSelectSourcesFolder: () => Promise<void>;
  addSearchSources: (selectedItems: WebSearch[]) => Promise<void>;


  // Functions
  loadEmbeddingModels: () => Promise<void>;
  loadModels: () => Promise<void>;
  loadConversations: () => Promise<void>;

}
const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined);

export const ChatBotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [conversation, setConversation] = React.useState<Conversation | undefined>();
  const [model, setModel] = React.useState<string | undefined>();
  const [embeddingModel, setEmbeddingModel] = React.useState<string | undefined>();
  const [voiceModel, setVoiceModel] = React.useState<string | undefined>();

  // Data
  const [conversations, setConversations] = React.useState<Conversation[] | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [availableModels, setAvailableModels] = React.useState<OllamaLibraryModel[] | undefined>();
  const [availableVoiceModels, setAvailableVoiceModels] = React.useState<OllamaLibraryModel[] | undefined>();
  const [availableEmbeddingModels, setAvailableEmbeddingModels] = React.useState<OllamaLibraryModel[] | undefined>();
  const [status, setStatus] = useState<AppStatus | string>('Loading...');


  useEffect(() => {
    loadStatus();
    loadEmbeddingModels();
    loadModels();
    loadConversations();
  }, []);

  // Update the useEffect dependencies and preselection logic
  useEffect(() => {
    if (availableModels?.length) {
      const installedModel = availableModels.find(m => m.installed);
      setModel(prev => prev || installedModel?.name || availableModels[0]?.name);
    }
  }, [availableModels]);

  useEffect(() => {
    if (availableEmbeddingModels?.length) {
      const installedEmbedding = availableEmbeddingModels.find(m => m.installed);
      setEmbeddingModel(prev => prev || installedEmbedding?.name || availableEmbeddingModels[0]?.name);
    }
  }, [availableEmbeddingModels]);

  // Update the conversation effect
  useEffect(() => {
    if (conversation) {
      setModel(prev => conversation.model || prev);
      setEmbeddingModel(prev => embeddingModel || prev);
    }
    setMessages(conversation?.messages ?? []);
  }, [conversation]);


  useEffect(() => {
    App.on(IPC.LLM.UPDATE_ALL_MODELS, (response: OllamaLibraryModel[]) => {
      setAvailableModels(response);
    });

    App.on(IPC.LLM.UPDATE_ALL_EMBEDDING_MODELS, (response: OllamaLibraryModel[]) => {
      setAvailableEmbeddingModels(response);
    });

    App.on(IPC.LLM.DOWNLOAD_MODEL_PROGRESS, (progress: OllamaModelDownloadProgress) => {
      console.log("model progress " + JSON.stringify(progress))
      setAvailableEmbeddingModels(embeddingModels =>
        embeddingModels?.map(m => ((m.name === progress.model) ? ({ ...m, progress: progress.progress }) : m)));
      setAvailableModels(models =>
        models?.map(m => ((m.name === progress.model) ? ({ ...m, progress: progress.progress }) : m)));
    });

    return () => {
      App.removeAllListeners(IPC.LLM.UPDATE_ALL_MODELS);
      App.removeAllListeners(IPC.LLM.UPDATE_ALL_EMBEDDING_MODELS);
    };
  }, []);

  const loadStatus = async () => {
    try {
      const response: AppStatus = await App.invoke(IPC.CORE.GET_APP_STATUS);
      if (response) {
        setStatus(response.Ollama === 'Running' ? response : 'Stopped');
      } else {
        setStatus('Error');
      }
    } catch (error) {
      console.error("Failed to get app status:", error);
      setStatus('Error');
    }
  };

  const loadEmbeddingModels = async () => {
    const response: OllamaLibraryModel[] = await App.invoke(IPC.LLM.GET_ALL_EMBEDDING_MODELS);
    console.log(response);
    if (response) {
      setAvailableEmbeddingModels(response);
    }
  };

  const loadModels = async () => {
    const response: OllamaLibraryModel[] = await App.invoke(IPC.LLM.GET_ALL_MODELS);
    if (response) {
      setAvailableModels(response);
    }
  };

  const loadConversations = async () => {
    try {
      const conversations: Conversation[] = await App.invoke(IPC.CONVERSATION.GET_ALL);
      setConversations(conversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const downloadModel = async (modelName: string, type: 'LLM' | 'Embedding') => {
    await App.invoke(IPC.LLM.DOWNLOAD_MODEL, modelName);
    if (type === 'LLM') {
      setModel(modelName);
      loadModels();
    } else {
      setEmbeddingModel(modelName);
      loadEmbeddingModels();
    }
  };

  const addSearchSources = async (selectedItems: WebSearch[]) => {
    App.invoke(IPC.SOURCE.ADD_SOURCES,
      selectedItems.map((item) => ({
        type: "Web",
        url: item.url,
        description: item.description,
        title: item.title
      }) as SourceInput), model, embeddingModel, false, conversation?.id, undefined)
      .then((newConversation: Conversation) =>
        setConversation(newConversation));
  };

  const handleSelectSourcesFolder = async () => {
    const paths: string[] | null = await App.invoke(IPC.SOURCE.SELECT_FOLDER);
    console.log(paths)
    if (!paths) return;

    const hasFileExtension = (p: string) => {
      const lastDotIndex = p.lastIndexOf('.');
      const lastSeparatorIndex = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
      return lastDotIndex > lastSeparatorIndex && lastDotIndex > 0;
    }

    paths.forEach(p => {
      const isFile = hasFileExtension(p);

      const params = isFile ? { type: "FilePath", filePath: p } : {type: "Directory", directoryPath: p}  as SourceInput

      App.invoke(IPC.SOURCE.ADD_SOURCES,
        [
          params
        ], model, embeddingModel, false, conversation?.id, undefined)
        .then((newConversation: Conversation) =>
          setConversation(newConversation));
      })
  };

  const value = {
    conversation,
    setConversation,
    messages,
    setMessages,
    model,
    setModel,
    embeddingModel,
    setEmbeddingModel,
    voiceModel,
    setVoiceModel,

    downloadModel,

    handleSelectSourcesFolder,
    addSearchSources,

    // Data
    conversations,
    setConversations,
    availableModels: availableModels ?? [],
    setAvailableModels,
    availableVoiceModels: availableVoiceModels ?? [],
    setAvailableVoiceModels,
    availableEmbeddingModels: availableEmbeddingModels ?? [],
    setAvailableEmbeddingModels,
    status,
    setStatus,

    // Functions
    loadModels,
    loadEmbeddingModels,
    loadConversations
  };

  return (
    <ChatBotContext.Provider value={value}>
      {children}
    </ChatBotContext.Provider>
  );
};

export const useChatBot = (): ChatBotContextType => {
  const context = useContext(ChatBotContext);
  if (context === undefined) {
    throw new Error('useChatBot must be used within an ChatBotProvider');
  }
  return context;
};
