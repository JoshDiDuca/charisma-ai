// Updated ChatInterface.tsx with drag and drop support
import React from 'react';
import { Card, CardBody } from '@heroui/react';
import { SettingsDropdown } from 'renderer/components/SettingsIcon';
import { useChatBot } from 'renderer/store/conversationProvider';
import { useVoiceRecorder } from 'renderer/hooks/useVoiceRecorder';
import "./Chat.scss";

import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { useChatMessages } from './useChatMessages';
import { usePasteHandler } from './usePasteHandler';

export interface ChatInterfaceProps {}

export const ChatInterface = ({}: ChatInterfaceProps) => {
  const {
    model,
    availableModels,
    embeddingModel,
    availableEmbeddingModels,
    conversation,
    setConversation,
    loadConversations,
  } = useChatBot();

  const {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    hasFirstResponse,
    handleSendMessage
  } = useChatMessages(
    model,
    availableModels,
    embeddingModel,
    conversation,
    setConversation,
    loadConversations
  );

  const {
    isLoading: isVoiceLoading,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecorder((transcribedText) => setInputValue(transcribedText));

  // Handle file attachments
  const handleAttach = async (file: File) => {
    // Implement your file attachment logic here
    console.log(`Handling file attachment: ${file.name}`);
    // await App.invoke(IPC.ATTACHMENTS.ATTACH_FILE, file);
  };

  const {
    attachments,
    removeAttachment,
    inputRef,
    handlePaste,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDragging
  } = usePasteHandler({
    inputValue,
    setInputValue,
    onAttach: handleAttach
  });

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Optional file picker handler
  const handleAttachmentClick = () => {
    // Implement file picker logic here if needed
    // For example:
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        Array.from(files).forEach(file => {
          handleAttach(file);
        });
      }
    };
    input.click();
  };

  return (
    <div
      className={`h-full w-full ${isDragging ? 'drag-active' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      <Card
        className="p-4 pt-2 rounded-none inset-shadow-lg relative"
        style={{ height: '100vh', width: '100%', overflowY: 'auto' }}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary flex items-center justify-center z-10 rounded-lg">
            <div className="bg-background p-4 rounded-lg shadow-lg text-center">
              <p className="text-xl font-semibold">Drop files here</p>
              <p className="text-sm text-gray-500">Files will be attached to your message</p>
            </div>
          </div>
        )}

        <SettingsDropdown />
        <CardBody
          className="flex-1 flex flex-col gap-2 bg-default-200 mb-2 p-4 w-100"
          style={{ overflowY: 'auto' }}
        >
          <MessageList messages={messages} hasFirstResponse={hasFirstResponse} />
        </CardBody>
        <InputArea
          inputValue={inputValue}
          setInputValue={setInputValue}
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
          isRecording={isRecording}
          isVoiceLoading={isVoiceLoading}
          handleMicClick={handleMicClick}
          inputRef={inputRef}
          attachments={attachments}
          onAttachmentRemove={removeAttachment}
          handleAttachmentClick={handleAttachmentClick}
        />
      </Card>
    </div>
  );
};
