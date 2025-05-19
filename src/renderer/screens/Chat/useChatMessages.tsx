// useChatMessages.ts - Custom hook for message handling logic
import { useState, useEffect } from 'react';
import { Message } from 'shared/types/Conversation';
import { Conversation } from 'shared/types/Conversation';
import { IPC } from 'shared/constants';
import { addToast } from '@heroui/react';
import { isNil, last } from 'lodash';
import { extractThoughtsAndMessage, processMessagesThoughts } from 'shared/utils/chat';

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
      setMessages(processMessagesThoughts(conversation.messages));
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

  // Helper to update messages with a new assistant partial
  const updateMessagesWithPartial = (prev: Message[], partial: string): Message[] => {
    const lastMsg = prev[prev.length - 1];
    if (!lastMsg || !lastMsg.incomplete) {
      // Start a new assistant message if last is complete
      const {text, thoughts} = extractThoughtsAndMessage(partial);
      return [
        ...prev,
        {
          timestamp: Date.now(),
          text: text ?? "",
          thoughts: thoughts,
          role: 'assistant',
          incomplete: true,
        },
      ];
    }


    // Append to the last assistant message
    return prev.map((msg, idx) => {
      const {text, thoughts} = extractThoughtsAndMessage((msg.text ?? "") + (partial ?? ""));
      return idx === prev.length - 1
        ? { ...msg, text, thoughts }
        : msg
    }
    );
  };

  // Handles incoming stream updates and updates messages accordingly
  const handleStreamUpdate = (partial: string) => {
    setHasFirstResponse(true);
    setMessages((prev) => updateMessagesWithPartial(prev, partial));
  };

  // Sets up and cleans up the stream update listener
  useEffect(() => {
    App.on(IPC.LLM.STREAM_UPDATE, handleStreamUpdate);
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
