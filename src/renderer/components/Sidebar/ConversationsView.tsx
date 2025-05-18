import React from 'react';
import { Card, Button } from '@heroui/react';
import { FaPlus, FaSpinner, FaTrash } from 'react-icons/fa';
import { Conversation } from 'shared/types/Conversation';

interface ConversationsViewProps {
  conversations: Conversation[] | undefined;
  conversation: Conversation | undefined;
  setConversation: (conversation: Conversation | undefined) => void;
  isCreatingConversation: boolean;
  handleCreateConversation: () => void;
  handleDeleteConversation: (id: string, e: React.MouseEvent) => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  conversations,
  conversation,
  setConversation,
  isCreatingConversation,
  handleCreateConversation,
  handleDeleteConversation
}) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-4" style={{ height: "100%", minWidth: "400px", overflowY: "auto" }}>
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
    </div>
  );
};
