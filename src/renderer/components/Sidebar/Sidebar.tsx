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
import { DirectorySourceInput, SourceInput } from 'shared/types/Sources/SourceInput';
import { FileItem } from './FileItem';
import { useChatBot } from 'renderer/store/conversationProvider';

const { App } = window;

export interface SidebarProps {
}

export const Sidebar = ({ }: SidebarProps) => {
  const {
    model,
    embeddingModel,
    setModel,
    setEmbeddingModel,
    conversation,
    setConversation,
    setConversations,
    conversations,
    loadModels,
    loadEmbeddingModels,
    loadConversations,
    status,
    availableModels,
    availableEmbeddingModels
  } = useChatBot();


  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const handleSelectFolder = async () => {
    const folder = await App.invoke(IPC.SOURCE.SELECT_FOLDER);
    if (!folder) return;

    const newConversation: Conversation = await App.invoke(IPC.SOURCE.ADD_SOURCES,
      [
        { type: "Directory", directoryPath: folder } as SourceInput
      ], model, undefined, undefined);
      setConversation(newConversation)
  };

  const handleCreateConversation = async () => {
    setIsCreatingConversation(true);
    try {
      setConversation(undefined);
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
        setConversations(prev => prev?.filter(conv => conv.id !== id) ?? []);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
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

  App.on(IPC.LLM.SEND_MESSAGE_FINISHED, () => {
    loadConversations();
  });

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
            value={model || ''}
            onChange={(value) => downloadModel(value, 'LLM')}
            options={availableModels.map((m) => ({
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
            value={embeddingModel || ''}
            onChange={(value) => downloadModel(value, 'Embedding')}
            options={availableEmbeddingModels.map((m) => ({
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
            {conversations?.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No conversations yet
              </div>
            ) : (
              <div className="divide-y">
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-2 cursor-pointer hover:bg-gray-50 flex justify-between items-start ${conversation?.id === conv.id ? 'bg-gray-100' : ''
                      }`}
                    onClick={() => setConversation(conv)}
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
                onClick: () => { },
                disabled: true
              }
            }} />
            <SearchModal
              isOpen={searchOpen}
              onAdd={async (selectedItems) => await App.invoke(IPC.SOURCE.ADD_SOURCES,
                selectedItems.map((item) => ({
                  type: "Web",
                  url: item.url,
                  description: item.description,
                  title: item.title
                }) as SourceInput), model, conversation?.id, undefined)}
              onClose={() => setSearchOpen(false)}
              searchFunction={(query) => App.invoke(IPC.SOURCE.QUERY, query)}
            />
          </div>
          <Card className="p-2 flex-grow overflow-y-auto" style={{ minHeight: '200px' }}>
            <div className="text-sm">
              {
                conversation?.sources &&
                conversation.sources.map((source) => {
                  switch (source.type) {
                    case 'Directory':
                      return source.fileTree && <Tree node={source.fileTree} />;
                    case 'Web':
                      return (<div><FileItem icon={'🌍'} id={source.url} name={source.title} depth={0} isExapndable={false} isExpanded={false} /></div>)
                    case 'File':
                    default:
                      return <div className="text-sm text-gray-500">{source.type} not yet implemented</div>;
                  }
                })
              }
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
};

export default Sidebar;
