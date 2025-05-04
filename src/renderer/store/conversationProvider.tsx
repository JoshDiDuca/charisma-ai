import { isNil } from 'lodash';
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { IPC } from 'shared/constants';
import { AppStatus } from 'shared/types/AppStatus';
import { Conversation, Message } from 'shared/types/Conversation';
import { OllamaModel } from 'shared/types/OllamaModel';

const { App } = window;

type ChatMessage = Message & {
  incomplete?: boolean;
}


interface ChatBotContextType {
  conversation?: Conversation;
  setConversation: React.Dispatch<React.SetStateAction<Conversation | undefined>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  model?:string;
  setModel: React.Dispatch<React.SetStateAction<string | undefined>>;
  embeddingModel?:string;
  setEmbeddingModel: React.Dispatch<React.SetStateAction<string | undefined>>;
  voiceModel?:string;
  setVoiceModel: React.Dispatch<React.SetStateAction<string | undefined>>;

  // Data
  conversations?: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[] | undefined>>;

  availableModels: OllamaModel[];
  setAvailableModels: React.Dispatch<React.SetStateAction<OllamaModel[] | undefined>>;

  availableVoiceModels: OllamaModel[];
  setAvailableVoiceModels: React.Dispatch<React.SetStateAction<OllamaModel[] | undefined>>;
  availableEmbeddingModels: OllamaModel[];
  setAvailableEmbeddingModels: React.Dispatch<React.SetStateAction<OllamaModel[] | undefined>>;
  status: AppStatus | string;
  setStatus: React.Dispatch<React.SetStateAction<AppStatus | string>>;


  // Functions
  loadEmbeddingModels: () => Promise<void>;
  loadModels: () => Promise<void>;
  loadConversations: () => Promise<void>;

}
const ChatBotContext = createContext<ChatBotContextType | undefined>(undefined);

export const ChatBotProvider: React.FC<{ children: ReactNode }> = ({ children  }) => {
  const [conversation, setConversation] = React.useState<Conversation | undefined>();
  const [model, setModel] = React.useState<string | undefined>();
  const [embeddingModel, setEmbeddingModel] = React.useState<string | undefined>();
  const [voiceModel, setVoiceModel] = React.useState<string | undefined>();

  // Data
  const [conversations, setConversations] = React.useState<Conversation[] | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [availableModels, setAvailableModels] = React.useState<OllamaModel[] | undefined>();
  const [availableVoiceModels, setAvailableVoiceModels] = React.useState<OllamaModel[] | undefined>();
  const [availableEmbeddingModels, setAvailableEmbeddingModels] = React.useState<OllamaModel[] | undefined>();
  const [status, setStatus] = useState<AppStatus | string>('Loading...');


  useEffect(() => {
    loadStatus();
    loadEmbeddingModels();
    loadModels();
    loadConversations();
  }, []);

  useEffect(() => {
    setMessages(conversation?.messages ?? []);
    if (conversation?.model) {
      setModel(conversation.model);
    }
  }, [conversation])

  useEffect(() => {
    if (availableModels && availableModels.length > 0 && !isNil(model)) {
      const installedModel = availableModels.find(m => m.type == "LLM" && m.installed);
      if (installedModel) {
        setModel(installedModel.name);
      } else if (availableModels[0]) {
        setModel(availableModels[0].name);
      }
    }
  }, [availableModels, model]);



  useEffect(() => {
    const unlistenModels = App.on(IPC.LLM.UPDATE_ALL_MODELS, (response: OllamaModel[]) => {
      setAvailableModels(response);
    });

    const unlistenEmbeddingModels = App.on(IPC.LLM.UPDATE_ALL_EMBEDDING_MODELS, (response: OllamaModel[]) => {
      setAvailableEmbeddingModels(response);
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
    const response: OllamaModel[] = await App.invoke(IPC.LLM.GET_ALL_EMBEDDING_MODELS);
    console.log(response);
    if (response) {
      setAvailableEmbeddingModels(response);
      if (response && response.length > 0 && !isNil(embeddingModel)) {
        const installedModel = response.find(m => m.type == "Embedding" && m.installed);
        if (installedModel) {
          setEmbeddingModel(installedModel.name);
        } else if (response[0]) {
          setEmbeddingModel(response[0].name);
        }
      }
    }
  };

  const loadModels = async () => {
    const response: OllamaModel[] = await App.invoke(IPC.LLM.GET_ALL_MODELS);
    if (response) {
      setAvailableModels(response);
      if (response && response.length > 0 && !isNil(embeddingModel)) {
        const installedModel = response.find(m => m.type == "LLM" && m.installed);
        if (installedModel) {
          setModel(installedModel.name);
        } else if (response[0]) {
          setModel(response[0].name);
        }
      }
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
    loadConversations,
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
