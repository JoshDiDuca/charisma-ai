import { Badge, Button, Card, Select, SelectItem } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Tree, TreeNode } from './FileTree';
import { OllamaModel } from 'shared/types/OllamaModel';
import { FaSpinner, FaPlus, FaComments, FaTrash } from 'react-icons/fa';
import { AppStatus } from 'shared/types/AppStatus';
import { Conversation } from 'shared/types/Conversation';
import { IPC } from 'shared/constants';
import { isNil, set } from 'lodash';
import { CustomSelect } from '../Common/Select';
import { MultiButton } from '../MultiButton';
import SearchModal from 'renderer/screens/Sources/Web/Search';

const { App } = window;

export interface SidebarProps {
  model: string;
  embeddingModel: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  setEmbeddingModel: React.Dispatch<React.SetStateAction<string>>;
  onSelectConversation: (conversation?: Conversation) => void;
  selectedConversationId?: string;
}

export const Sidebar = ({
  model,
  embeddingModel,
  setModel,
  setEmbeddingModel,
  onSelectConversation,
  selectedConversationId
}: SidebarProps) => {
  const [status, setStatus] = useState<AppStatus | string>('Loading...');
  const [filePath, setFilePath] = useState<string>('');
  const [embeddingModels, setEmbeddingModels] = useState<OllamaModel[]>([]);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [treeData, setTreeData] = useState<TreeNode>();
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const handleSelectFolder = async () => {
    const folder = await App.invoke(IPC.FILE.SELECT_FOLDER);
    if (!folder) return;

    setFilePath(folder);
    const fileList = await App.invoke(IPC.FILE.GET_FOLDER_FILES, folder);
    setTreeData(fileList);
  };

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
    if (response) {
      setEmbeddingModels(response);
    }
  };

  const loadModels = async () => {
    const response: OllamaModel[] = await App.invoke(IPC.LLM.GET_ALL_MODELS);
    if (response) {
      setModels(response);
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

  const handleCreateConversation = async () => {
    setIsCreatingConversation(true);
    try {
      onSelectConversation(undefined);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const success = await App.invoke(IPC.CONVERSATION.DELETE, id);
      if (success) {
        setConversations(prev => prev.filter(conv => conv.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  useEffect(() => {
    const unlistenModels = App.on(IPC.LLM.UPDATE_ALL_MODELS, (response: OllamaModel[]) => {
      setModels(response);
    });

    const unlistenEmbeddingModels = App.on(IPC.LLM.UPDATE_ALL_EMBEDDING_MODELS, (response: OllamaModel[]) => {
      setEmbeddingModels(response);
    });

    return () => {
      App.removeAllListeners(IPC.LLM.UPDATE_ALL_MODELS);
      App.removeAllListeners(IPC.LLM.UPDATE_ALL_EMBEDDING_MODELS);
    };
  }, []);

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

  App.on(IPC.LLM.SEND_MESSAGE_FINISHED, () => {
    loadConversations();
  });

  useEffect(() => {
    if (embeddingModels.length > 0 && !isNil(embeddingModel)) {
      const installedModel = embeddingModels.find(m => m.type == "Embedding" && m.installed);
      if (installedModel) {
        setEmbeddingModel(installedModel.name);
      } else if (embeddingModels[0]) {
        setEmbeddingModel(embeddingModels[0].name);
      }
    }
  }, [embeddingModels, embeddingModel]);

  useEffect(() => {
    if (models.length > 0 && !isNil(model)) {
      const installedModel = models.find(m => m.type == "LLM" && m.installed);
      if (installedModel) {
        setModel(installedModel.name);
      } else if (models[0]) {
        setModel(models[0].name);
      }
    }
  }, [models, model]);

  useEffect(() => {
    loadStatus();
    loadEmbeddingModels();
    loadModels();
    loadConversations();
  }, []);

  const getStatusDisplay = () => {
    if (typeof status === 'string') {
      return {
        text: status,
        color: status === 'Error' ? 'red' : 'green',
      };
    } else {
      const noChroma = status.ChromaDB === 'Stopped';
      const runningText = `Running (${status.GPU ? 'GPU' : 'CPU'})`;
      const embeddingText = noChroma ? ' - No Embedding' : '';
      return {
        text: runningText + embeddingText,
        color: noChroma ? 'orange' : 'green',
      };
    }
  };

  const { text: statusText, color: statusColor } = getStatusDisplay();

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="p-4" style={{ width: '400px', height: '100vh', overflowY: 'auto' }}>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center">
            <img
              src="/logo.png"
              width={25}
              height={25}
              alt="Logo"
              style={{ marginRight: '0.25rem' }}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Status:{' '}
                <b style={{ color: statusColor }}>
                  {statusText}
                </b>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Model</label>
        <CustomSelect
          value={model}
          onChange={(value) => downloadModel(value, 'LLM')}
          options={models.map((m) => ({
            key: m.name,
            value: m.name,
            label: (
              <div className="flex items-center justify-between w-full">
                <span>{m.name}</span>
                <span>
                  {m.installed ? "✔️" : m.installing ?
                    <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
                </span>
              </div>
            )
          }))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Embedding Model</label>
        <CustomSelect
          value={embeddingModel}
          onChange={(value) => downloadModel(value, 'Embedding')}
          options={embeddingModels.map((m) => ({
            key: m.name,
            value: m.name,
            label: (
              <div className="flex items-center justify-between w-full">
                <span>{m.name}</span>
                <span>
                  {m.installed ? "✔️" : m.installing ?
                    <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
                </span>
              </div>
            )
          }))}
        />
      </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Conversations</label>
            <Button
              variant="light"
              size="sm"
              onClick={handleCreateConversation}
              disabled={isCreatingConversation}
            >
              {isCreatingConversation ? (
                <FaSpinner style={{ animation: "spin 1s infinite linear" }} />
              ) : (
                <><FaPlus size={12} style={{ marginRight: '4px' }} /> New</>
              )}
            </Button>
          </div>
          <Card className="p-0 flex-grow overflow-y-auto" style={{ maxHeight: '200px' }}>
            {conversations.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No conversations yet
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-2 cursor-pointer hover:bg-gray-50 flex justify-between items-start ${
                      selectedConversationId === conv.id ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => onSelectConversation(conv)}
                  >
                    <div className="overflow-hidden">
                      <div className="text-sm font-medium truncate">{conv.title}</div>
                      <div className="text-xs text-gray-500">{formatTimestamp(conv.updatedAt)}</div>
                    </div>
                    <FaTrash onClick={(e) => handleDeleteConversation(conv.id, e)} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-2 flex-grow">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Sources:</label>
            <MultiButton options={{
                folder: {
                  label: "Add Folder",
                  description: "Add sources from a folder on your PC.",
                  onClick: () => handleSelectFolder(),
                  disabled: false
                },
                web: {
                  label: "Add Web",
                  description: "Search, find and add sources from the internet.",
                  onClick: () => setSearchOpen(true),
                  disabled: false
                },
                database: {
                  label: "Add Database",
                  description: "Connect to a relational database and search data.",
                  onClick: () => console.log("Database clicked"),
                  disabled: true
                }
              }} />
              <SearchModal isOpen={searchOpen} onAdd={() => { }}  onClose={() => setSearchOpen(false)} searchFunction={(query) => App.invoke(IPC.WEB.QUERY, query)} />
          </div>
          <Card className="p-2 flex-grow overflow-y-auto" style={{ minHeight: '200px' }}>
            <div className="text-sm">
              {treeData ? (
                <Tree node={treeData} onDelete={(_) => { }} />
              ) : (
                <span className="text-gray-500">No folder selected.</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
};

export default Sidebar;
