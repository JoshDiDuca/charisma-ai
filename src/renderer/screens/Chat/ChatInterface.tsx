import { useState } from 'react'
import { FaMicrophone, FaPaperclip, FaStop } from 'react-icons/fa'
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Spacer,
} from '@heroui/react'

type Message = {
  id: number
  text: string
  sender: 'user' | 'bot'
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: inputValue, sender: 'user' },
      ])
      setInputValue('')
    }
  }

  const handleStopGenerating = () => {
    // Add logic for stopping the AI response generation
    console.log('Stop generating...')
  }

  return (
    <Card className="flex flex-col h-screen max-w-md mx-auto bg-default-100 p-4">
      <CardHeader className="bg-primary text-primary-foreground rounded-medium mb-2">
        <span className="text-xl font-bold">AI Chat</span>
      </CardHeader>
      <CardBody className="flex-1 overflow-y-auto flex flex-col gap-2 bg-default-200 rounded-medium mb-2 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[80%] px-4 py-2 rounded-large ${
              message.sender === 'user'
                ? 'self-end bg-primary text-primary-foreground'
                : 'self-start bg-default-300 text-default-foreground'
            }`}
          >
            {message.text}
          </div>
        ))}
      </CardBody>
      <div className="flex items-center gap-2 mb-2">
        <Button isIconOnly variant="bordered" aria-label="Attach file">
          <FaPaperclip />
        </Button>
        <Input
          className="flex-1"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          variant="bordered"
        />
        <Button isIconOnly variant="bordered" aria-label="Mic">
          <FaMicrophone />
        </Button>
        <Button color="primary" onClick={handleSendMessage}>
          Send
        </Button>
      </div>
      <div className="flex justify-center">
        <Button
          color="danger"
          variant="solid"
          onClick={handleStopGenerating}
          startContent={<FaStop />}
        >
          Stop Generating
        </Button>
      </div>
    </Card>
  )
}

export default ChatInterface
