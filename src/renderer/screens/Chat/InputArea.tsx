import React from 'react'
import { Button } from '@heroui/react'
import { FaMicrophone, FaPaperclip, FaSpinner, FaStop } from 'react-icons/fa'
import { AttachmentList } from './Attachment'
import { Source } from 'shared/types/Sources/Source'

interface InputAreaProps {
  inputValue: string
  setInputValue: (value: string) => void
  handleSendMessage: () => void
  isLoading: boolean
  isRecording: boolean
  isVoiceLoading: boolean
  handleMicClick: () => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  handlePaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void
  attachments: Source[]
  onAttachmentRemove: (index: number) => void
  handleAttachmentClick?: () => void
}

export const InputArea: React.FC<InputAreaProps> = ({
  inputValue,
  setInputValue,
  handleSendMessage,
  isLoading,
  isRecording,
  isVoiceLoading,
  handleMicClick,
  inputRef,
  handlePaste,
  attachments,
  onAttachmentRemove,
  handleAttachmentClick
}) => {
  const maxRows = 10
  const rowCount = Math.min(maxRows, inputValue.split('\n').length)

  return (
    <div
      id="message-input-container"
      className="flex flex-col"
      onPaste={handlePaste}
    >
      <div className="flex items-center gap-2 mb-2">
        <Button
          isIconOnly
          variant="bordered"
          aria-label="Attach file"
          onClick={handleAttachmentClick}
        >
          <FaPaperclip />
        </Button>

        <textarea
          className="flex-1 w-full border rounded p-2 resize-none"
          id="message-input"
          placeholder="Type your message or paste content here..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
            // Shift+Enter inserts newline by default
          }}
          rows={rowCount}
          disabled={isRecording}
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        />

        <Button
          isIconOnly
          variant="bordered"
          aria-label={isRecording ? 'Stop recording' : 'Record audio'}
          color={isRecording ? 'danger' : 'default'}
          onClick={handleMicClick}
          disabled={isVoiceLoading}
        >
          {isVoiceLoading
            ? <FaSpinner style={{ animation: 'spin 1s infinite linear' }} />
            : isRecording
              ? <FaStop />
              : <FaMicrophone />
          }
        </Button>

        <Button
          color="primary"
          onClick={handleSendMessage}
          disabled={
            isRecording ||
            (!inputValue.trim() && attachments.length === 0 && !isLoading)
          }
        >
          Send
        </Button>
      </div>

      <AttachmentList
        attachments={attachments}
        onRemove={onAttachmentRemove}
      />
    </div>
  )
}
