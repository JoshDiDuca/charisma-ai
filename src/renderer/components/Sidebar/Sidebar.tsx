import {
  Navbar,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Button,
  Card,
  Badge,
  Select,
  SelectItem
} from '@heroui/react';
import { useEffect, useState } from 'react';
import { Tree, TreeNode } from './FileTree';
import { OllamaModel } from 'shared/types/OllamaModel';
import {
  FaComments,
  FaSearch,
  FaCog,
  FaFolder,
  FaSpinner,
  FaPlus,
  FaTrash,
  FaBars,
  FaTimes,
  FaPaperclip
} from 'react-icons/fa';
import { AppStatus } from 'shared/types/AppStatus';
import { Conversation } from 'shared/types/Conversation';
import { IPC } from 'shared/constants';
import { isNil, set } from 'lodash';
import { CustomSelect } from '../Common/Select';
import { MultiButton } from '../MultiButton';
import SearchModal from 'renderer/screens/Sources/Web/Search';
import { DirectorySourceInput, SourceInput } from 'shared/types/Sources/Source';
import { FileItem } from './FileItem';
import { useChatBot } from 'renderer/store/conversationProvider';
import { WebSearch } from 'shared/types/Sources/WebSearch';
import logo from "./../../public/logo.png"

const { App } = window;

export interface SidebarProps { }

export const Sidebar = ({ }: SidebarProps) => {
  const [activeView, setActiveView] = useState<'conversations' | 'sources' | 'settings' | 'search'>('conversations');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

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


  const handleSelectFolder = async () => {
    const folder = await App.invoke(IPC.SOURCE.SELECT_FOLDER);
    if (!folder) return;

    App.invoke(IPC.SOURCE.ADD_SOURCES,
      [
        { type: "Directory", directoryPath: folder } as SourceInput
      ], model, conversation?.id, undefined)
      .then((newConversation: Conversation) =>
        setConversation(newConversation));
  };

  const addSearchSources = async (selectedItems: WebSearch[]) => {
    App.invoke(IPC.SOURCE.ADD_SOURCES,
      selectedItems.map((item) => ({
        type: "Web",
        url: item.url,
        description: item.description,
        title: item.title
      }) as SourceInput), model, conversation?.id, undefined)
      .then((newConversation: Conversation) =>
        setConversation(newConversation));
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
        if (id === conversation?.id) {
          setConversation(undefined);
        }
        const newConversations = conversations?.filter(conv => conv.id !== id) ?? []
        setConversations(newConversations);
        //If no conversations, new conversation
        if (!newConversations.length) {
          setIsCreatingConversation(true);
          setConversation(undefined);
          setIsCreatingConversation(false);
        }
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

  const getStatusDisplay = () => {
    if (typeof status === 'string') {
      return {
        text: status,
        color: status === 'Error' ? 'red' : 'green',
      };
    } else {
      const noDB = status.Database === 'Stopped';
      const runningText = `Running (${status.GPU ? 'GPU' : 'CPU'})`;
      const embeddingText = noDB ? ' - No Embedding' : '';
      return {
        text: runningText + embeddingText,
        color: noDB ? 'orange' : 'green',
      };
    }
  };

  const { text: statusText, color: statusColor } = getStatusDisplay();

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex h-screen">
      {/* Collapsible Sidebar */}
      <Card
        className={`rounded-none`}
      >
        <div className="flex flex-col h-full p-2">
          {/* Top Section */}
          <div className="flex items-left justify-left h-12">
            {isCollapsed ? (
              <img src={logo}
                title="Logo"
                className="w-8 h-8 cursor-pointer"
              />
            ) : (
              <>
                <img src={logo}
                  title="Logo"
                  className="w-8 h-8 cursor-pointer" />
                <div style={{ marginLeft: "0.2rem" }} className="ml-4 text-lg font-semibold">Charisma</div>
              </>
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex-1 space-y-2" style={{ marginTop: "0.5rem", width: (!isCollapsed ? "300px" : "") }}>
            <div
              className="w-full justify-start h-10 w-10 px-2 rounded-lg cursor-pointer"
              onClick={() => setActiveView('conversations')}
            >
              <FaComments className="text-xl" />
              {!isCollapsed && <span className="ml-3">Conversations</span>}
            </div>

            <div
              className="w-full justify-start h-10 w-10 px-2 rounded-lg cursor-pointer"
              onClick={() => setActiveView('sources')}
            >
              <FaPaperclip className="text-xl" />
              {!isCollapsed && <span className="ml-3">Sources</span>}
            </div>

            {/* Add other navigation items */}
          </div>
          {/* Bottom Settings */}
          <div className="border-t pt-2">
            <div
              className="w-full justify-start h-10 w-10 px-2 rounded-lg cursor-pointer"
              onClick={() => setActiveView('settings')}
            >
              <FaCog className="text-xl" />
              {!isCollapsed && <span className="ml-3">Settings</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      <div
      >
        {activeView === 'conversations' && (
          <Card className="p-4 inset-shadow-3xs rounded-none" style={{ height: "100%", minWidth: "400px" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Conversations</h2>
              <Button
                variant="light"
                size="sm"
                onClick={handleCreateConversation}
                disabled={isCreatingConversation}
              >
                {isCreatingConversation ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <><FaPlus className="mr-1" /> New</>
                )}
              </Button>
            </div>
            {conversations?.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No conversations yet
              </div>
            ) : (
              <div className="divide-y">
                {conversations?.map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-2 cursor-pointer hover:bg-gray-50 flex justify-between items-start ${conversation?.id === conv.id ? 'bg-gray-100' : ''}`}
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
        )}

        {activeView === 'sources' && (
          <Card className="p-4 rounded-none" style={{ height: "100%", minWidth: "400px" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Sources</h2>
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
            </div>
            <Card className="p-2 flex-grow overflow-y-auto rounded-none" style={{ minHeight: '200px' }}>
              <div className="text-sm">
                {
                  conversation?.sources &&
                  conversation.sources.map((source) => {
                    switch (source.type) {
                      case 'Directory':
                        return source.fileTree && <Tree node={source.fileTree} />;
                      case 'Web':
                        return (<div><FileItem icon={'🌍'} id={source.url} name={source.title} depth={0} isExpandable={false} isExpanded={false} /></div>)
                      case 'File':
                      default:
                        return <div className="text-sm text-gray-500">{source.type} not yet implemented</div>;
                    }
                  })
                }
              </div>
            </Card>
          </Card>
        )}

        {activeView === 'settings' && (
          <Card className="p-4  rounded-none" style={{ height: "100%", minWidth: "400px" }}>
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center mb-4">
                <span className="text-sm font-medium">
                  Status: <b style={{ color: statusColor }}>{statusText}</b>
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Model</label>
                <CustomSelect
                  value={model}
                  onChange={(value) => downloadModel(value, 'LLM')}
                  options={availableModels.map((m) => ({
                    key: m.name,
                    value: m.name,
                    label: (
                      <div className="flex items-center justify-between w-full">
                        <span>{m.name}{m.progress && m.progress < 100 && ` - ${m.progress.toFixed(1)}%`}</span>
                        <span>
                          {m.installed ? "✔️" : m.installing || (!!m.progress && m.progress < 100) ?
                            <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
                        </span>
                      </div>
                    )
                  }))} />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Embedding Model</label>
                <CustomSelect
                  value={embeddingModel}
                  onChange={(value) => downloadModel(value, 'Embedding')}
                  options={availableEmbeddingModels.map((m) => ({
                    key: m.name,
                    value: m.name,
                    label: (
                      <div className="flex items-center justify-between w-full">
                        <span>{m.name}{m.progress && m.progress < 100 && ` - ${m.progress.toFixed(1)}%`}</span>
                        <span>
                          {m.installed ? "✔️" : m.installing || (!!m.progress && m.progress < 100) ?
                            <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
                        </span>
                      </div>
                    )
                  }))} />
              </div>
            </div>
          </Card>
        )}

        {activeView === 'search' && (
          <Card className="p-4 rounded-none">
            <SearchModal
              isOpen={searchOpen}
              onAdd={addSearchSources}
              onClose={() => setSearchOpen(false)}
              searchFunction={(query) => App.invoke(IPC.SOURCE.QUERY, query)}
            />
          </Card>
        )}
      </div>
    </div>
  );
};
