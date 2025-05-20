import { Card } from '@heroui/react';
import { useState, useRef, useEffect } from 'react';
import { FaComments, FaCog, FaSlidersH } from 'react-icons/fa';
import { IPC } from 'shared/constants';
import { useChatBot } from 'renderer/store/conversationProvider';
import logo from "./../../public/logo.png";
import { ConversationsView } from './ConversationsView';
import { Config } from './Config';
import { SettingsView } from './Settings';
import SearchModal from 'renderer/screens/Sources/Web/Search';

const { App } = window;

type SidebarOptionKeys = 'conversations' | 'sources' | 'settings' | 'ai-model';

type SidebarOption = {
  [page: string]: {
    label: string;
    icon: React.ReactNode;
    element: React.ReactNode;
    sortOrder: number;
    hideOthers?: boolean;
    bottom?: boolean;
  }
};

export interface SidebarProps { }

export const Sidebar = ({ }: SidebarProps) => {
  const [activeViews, setActiveViews] = useState<SidebarOptionKeys[]>([]);
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
    conversation,
    setConversation,
    setConversations,
    conversations,
    handleSelectSourcesFolder,
    downloadModel,
    addSearchSources,
    status,
    availableModels,
    availableEmbeddingModels
  } = useChatBot();

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


  const SidebarOptions: SidebarOption = {
    Conversations: {
      sortOrder: 2,
      label: "Conversations",
      icon: <FaComments className="text-xl" />,
      hideOthers: true,
      element: <ConversationsView
        conversations={conversations}
        conversation={conversation}
        setConversation={setConversation}
        isCreatingConversation={isCreatingConversation}
        handleCreateConversation={handleCreateConversation}
        handleDeleteConversation={handleDeleteConversation}
      />
    },
    AiModel: {
      sortOrder: 0,
      label: "AI Settings",
      icon: <FaSlidersH className="text-xl" />,
      element: <>
        <SearchModal
          isOpen={searchOpen}
          onAdd={addSearchSources}
          onClose={() => setSearchOpen(false)}
          searchFunction={(query) => App.invoke(IPC.SOURCE.QUERY, query)}
        />
        <Config
          conversation={conversation}
          handleSelectFolder={handleSelectSourcesFolder}
          setSearchOpen={setSearchOpen}
          model={model}
          embeddingModel={embeddingModel}
          availableModels={availableModels}
          availableEmbeddingModels={availableEmbeddingModels}
          downloadModel={downloadModel}
        />
      </>
    },
    Settings: {
      sortOrder: 3,
      label: "Settings",
      icon: <FaCog className="text-xl" />,
      bottom: true,
      hideOthers: true,
      element: <SettingsView
        status={status}
      />
    },
  }

  const openOrCloseTab = (key: SidebarOptionKeys) => {
    if (activeViews.includes(key)) {
      setActiveViews((views) => views.filter(v => v !== key))
    } else {
      if (SidebarOptions[key].hideOthers) {
        setActiveViews([key]);
      } else {
        setActiveViews((views) => [...views.filter(v => !SidebarOptions[v].hideOthers), key]);
      }
    }
  }

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

            {(Object.keys(SidebarOptions) as SidebarOptionKeys[]).map(sidebarOption => SidebarOptions[sidebarOption].bottom ? null : (

              <div
                className={`flex items-center w-full justify-start h-10 px-2 rounded-lg cursor-pointer`}
                style={{ color: (activeViews.includes(sidebarOption)) ? "#4292c6" : "black" }}
                onClick={() => openOrCloseTab(sidebarOption)}
              >
                {SidebarOptions[sidebarOption].icon}
                {!isCollapsed && <span className='font-semibold' style={{ marginLeft: "0.25rem" }}>{SidebarOptions[sidebarOption].label}</span>}
              </div>
            ))}
          </div>

          {/* Bottom Settings */}
          <div className="border-t pt-2">
            {(Object.keys(SidebarOptions) as SidebarOptionKeys[]).map(sidebarOption => !SidebarOptions[sidebarOption].bottom ? null : (

              <div
                className={`flex items-center w-full justify-start h-10 px-2 rounded-lg cursor-pointer`}
                style={{ color: (activeViews.includes(sidebarOption)) ? "#4292c6" : "black" }}
                onClick={() => openOrCloseTab(sidebarOption)}
              >
                {SidebarOptions[sidebarOption].icon}
                {!isCollapsed && <span className='font-semibold' style={{ marginLeft: "0.25rem" }}>{SidebarOptions[sidebarOption].label}</span>}
              </div>
            ))}
          </div>

        </div>
      </Card>

      {/* Main Content Area with Drag Resizing */}
      {activeViews.length > 0 && (
        <div
          style={{
            position: 'relative',
            width: `${panelWidth}px`,
            transition: isDragging ? 'none' : 'width 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
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

          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {activeViews.toSorted((a, b) => SidebarOptions[a].sortOrder - SidebarOptions[b].sortOrder).map(a => (
              <div key={a}>
                {SidebarOptions[a].element}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
