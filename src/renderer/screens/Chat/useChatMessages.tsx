// useChatMessages.ts - Custom hook for message handling logic
import { useState, useEffect } from 'react';
import { Message } from 'shared/types/Conversation';
import { Conversation } from 'shared/types/Conversation';
import { IPC } from 'shared/constants';
import { addToast } from '@heroui/react';
import { isNil, last } from 'lodash';

const { App } = window;

export const useChatMessages = (
  model: string | undefined,
  availableModels: any[],
  embeddingModel: string | undefined,
  conversation: Conversation | null | undefined,
  setConversation: (conversation: Conversation) => void,
  loadConversations: () => void
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFirstResponse, setHasFirstResponse] = useState(true);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversation?.id) {
      // Update messages from the current conversation
      setMessages(conversation.messages || []);
    } else {
      // Clear messages when no conversation is selected
      setMessages([]);
    }
  }, [conversation]);

  const handleSendMessage = async () => {
    const inputValueTrimmed = inputValue.trim();
    if (isNil(inputValueTrimmed) || inputValueTrimmed === "" || isLoading) return;

    if (isNil(model) || model === "" || availableModels.filter(e => !e.installed).map(e => e.name).includes(model)) {
      addToast({ title: "Please select a model." });
      return;
    }

    const userMessage = {
      timestamp: Date.now(),
      text: inputValue,
      role: 'user' as const,
      incomplete: false
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setHasFirstResponse(false);

    App.invoke(
      IPC.LLM.SEND_MESSAGE,
      inputValue,
      model,
      embeddingModel,
      conversation?.id
    ).then((response: Conversation) => {
      loadConversations();
      const lastMessage = last(response.messages.filter(m => m.role === 'assistant'));
      if (response.id && lastMessage) {
        setConversation(response);
        App.invoke(
          IPC.VOICE.TEXT_TO_SPEECH,
          lastMessage.text
        );
      }
    }).catch((error) => {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          timestamp: Date.now(),
          text: `Error: ${error}`,
          role: 'assistant',
          incomplete: false
        },
      ]);
    }).finally(() => {
      setIsLoading(false);
      setHasFirstResponse(true);
    });
  };

  useEffect(() => {
    const streamHandler = (partial: string) => {
      setHasFirstResponse(true);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last?.incomplete) {
          return [
            ...prev,
            {
              timestamp: Date.now(),
              text: partial ?? "",
              role: 'assistant',
              incomplete: true
            },
          ];
        }
        return prev.map((msg, i) =>
          i === prev.length - 1 ? { ...msg, text: (msg.text ?? "") + (partial ?? "") } : msg
        );
      });
    };

    App.on(IPC.LLM.STREAM_UPDATE, streamHandler);
    return () => {
      App.removeAllListeners(IPC.LLM.STREAM_UPDATE);
    };
  }, []);

  return {
    messages,
    setMessages,
    loadConversations,
    inputValue,
    setInputValue,
    isLoading,
    hasFirstResponse,
    handleSendMessage
  };
};
