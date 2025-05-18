import { Card } from '@heroui/react';
import { useState, useRef, useEffect } from 'react';
import { FaComments, FaCog, FaPaperclip, FaRobot, FaSlidersH } from 'react-icons/fa';
import { Conversation } from 'shared/types/Conversation';
import { IPC } from 'shared/constants';
import { SourceInput } from 'shared/types/Sources/Source';
import { useChatBot } from 'renderer/store/conversationProvider';
import { WebSearch } from 'shared/types/Sources/WebSearch';
import logo from "./../../public/logo.png";
import { ConversationsView } from './ConversationsView';
import { SourcesView } from './SourceView';
import { SettingsView } from './Settings';
import { AIModelView } from './AIModelView';
import SearchModal from 'renderer/screens/Sources/Web/Search';

const { App } = window;

export interface SidebarProps { }

export const Sidebar = ({ }: SidebarProps) => {
  const [activeView, setActiveView] = useState<'conversations' | 'sources' | 'settings' | 'ai-model' | 'search' | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(0);

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
      ], model, false, conversation?.id, undefined)
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
      }) as SourceInput), model, false, conversation?.id, undefined)
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

  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = panelWidth;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartXRef.current;
        const newWidth = Math.max(400, dragStartWidthRef.current + deltaX);
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex h-screen">
      {/* Collapsible Sidebar */}
      <Card className="rounded-none">
        <div className="flex flex-col h-full p-2">
          {/* Top Section */}
          <div className="flex items-left justify-left h-12">
            {isCollapsed ? (
              <img src={logo}
                title="Logo"
                className="w-8 h-8 cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
              />
            ) : (
              <>
                <img src={logo}
                  title="Logo"
                  className="w-8 h-8 cursor-pointer"
                  onClick={() => setIsCollapsed(!isCollapsed)} />
                <div style={{ marginLeft: "0.2rem" }} className="ml-4 text-lg font-semibold">Charisma</div>
              </>
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex-1 space-y-2" style={{ marginTop: "0.5rem", width: (!isCollapsed ? "150px" : "") }}>
            <div
              className={`flex items-center w-full justify-start h-10 px-2 rounded-lg cursor-pointer ${activeView === 'ai-model' ? 'bg-blue-100' : ''}`}
              onClick={() => setActiveView(activeView === 'ai-model' ? null : 'ai-model')}
            >
              <FaSlidersH className="text-xl" />
              {!isCollapsed && <span className='font-semibold' style={{ marginLeft: "0.25rem" }}>AI Config</span>}
            </div>

            <div
              className={`flex items-center w-full justify-start h-10 px-2 rounded-lg cursor-pointer ${activeView === 'conversations' ? 'bg-blue-100' : ''}`}
              onClick={() => setActiveView(activeView === 'conversations' ? null : 'conversations')}
            >
              <FaComments className="text-xl" />
              {!isCollapsed && <span className='font-semibold' style={{ marginLeft: "0.25rem" }}>Conversations</span>}
            </div>

            <div
              className={`flex items-center w-full justify-start h-10 px-2 rounded-lg cursor-pointer ${activeView === 'sources' ? 'bg-blue-100' : ''}`}
              onClick={() => setActiveView(activeView === 'sources' ? null : 'sources')}
            >
              <FaPaperclip className="text-xl" />
              {!isCollapsed && <span className='font-semibold' style={{ marginLeft: "0.25rem" }}>Sources</span>}
            </div>
          </div>

          {/* Bottom Settings */}
          <div className="border-t pt-2">
            <div
              className={`flex items-center w-full justify-start h-10 px-2 rounded-lg cursor-pointer ${activeView === 'settings' ? 'bg-blue-100' : ''}`}
              onClick={() => setActiveView(activeView === 'settings' ? null : 'settings')}
            >
              <FaCog className="text-xl" />
              {!isCollapsed && <span className='font-semibold' style={{ marginLeft: "0.25rem" }}>Settings</span>}
            </div>
          </div>

        </div>
      </Card>

      {/* Main Content Area with Drag Resizing */}
      {activeView && (
        <div
          style={{
            position: 'relative',
            width: `${panelWidth}px`,
            transition: isDragging ? 'none' : 'width 0.2s ease'
          }}
        >
          {/* Drag Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              height: '100%',
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: isDragging ? '#aaa' : 'transparent',
              zIndex: 10
            }}
            onMouseDown={startDrag}
          />

          {/* View Components */}
          {activeView === 'conversations' && (
            <ConversationsView
              conversations={conversations}
              conversation={conversation}
              setConversation={setConversation}
              isCreatingConversation={isCreatingConversation}
              handleCreateConversation={handleCreateConversation}
              handleDeleteConversation={handleDeleteConversation}
            />
          )}

          {activeView === 'sources' && (
            <>
              <SearchModal
                isOpen={searchOpen}
                onAdd={addSearchSources}
                onClose={() => setSearchOpen(false)}
                searchFunction={(query) => App.invoke(IPC.SOURCE.QUERY, query)}
              /><SourcesView
                conversation={conversation}
                handleSelectFolder={handleSelectFolder}
                setSearchOpen={setSearchOpen}
              />
            </>


          )}

          {activeView === 'settings' && (
            <SettingsView
              status={status}
            />
          )}

          {activeView === 'ai-model' && (
            <AIModelView
              model={model}
              embeddingModel={embeddingModel}
              availableModels={availableModels}
              availableEmbeddingModels={availableEmbeddingModels}
              downloadModel={downloadModel}
            />
          )}

          {activeView === 'search' && (
            <Card className="p-4 rounded-none">
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
