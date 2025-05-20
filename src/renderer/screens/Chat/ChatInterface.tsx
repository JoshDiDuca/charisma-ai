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
import { IPC } from 'shared/constants';
import { SourceInput } from 'shared/types/Sources/Source';
import { Conversation } from 'shared/types/Conversation';

export interface ChatInterfaceProps {}

const { App } = window;

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
  const handleAttach = async (file: File, data: ArrayBuffer) => {
      App.invoke(IPC.SOURCE.ADD_SOURCES,
        [{
          type: "File",
          file: data,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        } as SourceInput], model, embeddingModel, true, conversation?.id, undefined)
        .then((newConversation: Conversation) =>
          setConversation(newConversation));
  };

  const {
    inputRef,
    handlePaste,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeAttachment,
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

const handleAttachmentClick = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.onchange = async (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        try {
          // Read file data using FileReader
          const data = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
          });

          // Pass both file and data to handleAttach
          await handleAttach(file, data);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }
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
          attachments={conversation?.pendingAttachments ?? []}
          onAttachmentRemove={removeAttachment}
          handleAttachmentClick={handleAttachmentClick}
        />
      </Card>
    </div>
  );
};
