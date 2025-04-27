import { useEffect, useState } from 'react'
import { FaMicrophone, FaPaperclip, FaStop } from 'react-icons/fa'
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Spacer,
} from '@heroui/react'
import { ModelManager } from 'renderer/components'
import Markdown from 'react-markdown'

type Message = {
  id: number
  text: string
  sender: 'user' | 'bot'
}

const { App } = window

export interface ChatInterfaceProps {
  model: string;
  embeddingModel: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  setEmbeddingModel: React.Dispatch<React.SetStateAction<string>>;
}
export const ChatInterface = ({ model, embeddingModel, setModel, setEmbeddingModel}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user' as const,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Send message and receive stream
      const response = await App.invoke(
        'send-message',
        inputValue,
        model
      )

      // Add final message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: response.content,
          sender: 'bot',
        },
      ])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `Error: ${error}`,
          sender: 'bot',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Stream handler
  useEffect(() => {
    const streamHandler = (
      _: any,
      {
        partial,
        complete,
      }: {
        partial: string
        complete: boolean
      }
    ) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (complete || last?.sender === 'user') {
          return [
            ...prev,
            {
              id: Date.now(),
              text: partial,
              sender: 'bot',
            },
          ]
        }
        return prev.map((msg, i) =>
          i === prev.length - 1 ? { ...msg, text: msg.text + partial } : msg
        )
      })
    }

    App.on('stream-update', streamHandler)
    return () => {
      App.removeAllListeners('stream-update')
    }
  }, [])

  return (
    <Card
      className="p-4"
      style={{ height: '100vh', width: '100%', overflowY: 'auto' }}
    >
      <CardBody
        className="flex-1 flex flex-col gap-2 bg-default-200 rounded-medium mb-2 p-4"
        style={{ overflowY: 'auto' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[80%] px-4 py-2 rounded-large ${
              message.sender === 'user'
                ? 'self-end bg-primary text-primary-foreground'
                : 'self-start bg-default-300 text-default-foreground'
            }`}
          >
            <Markdown>{message.text}</Markdown>
          </div>
        ))}
      </CardBody>
      <div
        className="flex items-center gap-2 mb-2"
        style={{ marginBottom: '1.5rem', position: 'sticky' }}
      >
        <Button isIconOnly variant="bordered" aria-label="Attach file">
          <FaPaperclip />
        </Button>
        <Input
          className="flex-1"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage()
            }
          }}
          variant="bordered"
        />
        <Button isIconOnly variant="bordered" aria-label="Mic">
          <FaMicrophone />
        </Button>
        <Button color="primary" onClick={handleSendMessage}>
          Send
        </Button>
      </div>
    </Card>
  )
}
