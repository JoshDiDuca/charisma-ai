import React from 'react';
import { Message } from 'shared/types/Conversation';
import { MessageItem } from './MessageItem';
import { Spinner } from '@heroui/react';

interface MessageListProps {
  messages: Message[];
  hasFirstResponse: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, hasFirstResponse }) => {
  return (
    <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
      {messages.map((message) => (
        <MessageItem key={message.timestamp} message={message} />
      ))}
      {!hasFirstResponse && <Spinner />}
    </div>
  );
};
