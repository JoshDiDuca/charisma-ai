import { useEffect, useState, useRef } from 'react';
import { FaMicrophone, FaPaperclip, FaSpinner, FaStop } from 'react-icons/fa';
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Spacer,
  Spinner,
  Tabs,
  Tab,
  Accordion,
  AccordionItem,
} from '@heroui/react';
import Markdown from 'react-markdown';
import { inc } from 'semver';
import { IPC } from 'shared/constants';
import { Conversation, Message } from 'shared/types/Conversation';
import { SettingsDropdown } from 'renderer/components/SettingsIcon';
import { useChatBot } from 'renderer/store/conversationProvider';
import { get, last } from 'lodash';
import { useVoiceRecorder } from 'renderer/hooks/useVoiceRecorder';

const { App } = window;

export interface ChatInterfaceProps {
}

export const ChatInterface = ({
}: ChatInterfaceProps) => {
  const {
    model,
    setModel,
    conversation,
    setMessages,
    setConversation,
    messages
  } = useChatBot();


  const {
    isLoading: isVoiceLoading,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecorder((transcribedText) => setInputValue(transcribedText));

  // Replace handleMicClick with:
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFirstResponse, setHasFirstResponse] = useState(true);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

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

    try {
      const response: Conversation = await App.invoke(
        IPC.LLM.SEND_MESSAGE,
        inputValue,
        model,
        conversation?.id
      );

      const lastMessage = last(response.messages.filter(m => m.role === 'assistant'))
      if (response.id && lastMessage) {
        setConversation(response);
        await App.invoke(
          IPC.VOICE.TEXT_TO_SPEECH,
          lastMessage.text
        );
      }
    } catch (error) {
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
    } finally {
      setIsLoading(false);
      setHasFirstResponse(true);
    }
  };


  useEffect(() => {
    const streamHandler = (
      partial: string
    ) => {
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

  return (
    <Card
      className="p-4 pt-2"
      style={{ height: '100vh', width: '100%', overflowY: 'auto' }}
    >
      <SettingsDropdown />
      <CardBody
        className="flex-1 flex flex-col gap-2 bg-default-200 rounded-medium mb-2 p-4"
        style={{ overflowY: 'auto' }}
      >
        {messages.map((message) => (
          <div
            key={message.timestamp}
            className={`max-w-[80%] px-4 py-2 rounded-large ${message.role === 'user'
              ? 'self-end bg-primary text-primary-foreground'
              : 'self-start bg-default-300 text-default-foreground'
              }`}
          >
            {!message.messageSources || message.messageSources.length === 0 ?
              <Markdown>{message.userInput || message.text}</Markdown>
              :
              <Tabs aria-label="Options">
                <Tab key="answer" title="Answer">
                  <Card>
                    <CardBody>
                      <Markdown>{message.userInput || message.text}</Markdown>
                    </CardBody>
                  </Card>
                </Tab>
                <Tab key="sources" title="Sources">
                  <Card>
                    <CardBody>
                      <Accordion>
                        {message.messageSources?.map((source, index) => {
                          const title = get(source.metadata, "title");
                          const path = get(source.metadata, "path");
                          const url = get(source.metadata, "url");
                          const score = source.score;

                          const useTitle = title || path || url || `Source ${index}`;
                          const elementTitle = useTitle + ` ${score ? `(${score})` : ""}`;

                          return (<AccordionItem
                            key={index}
                            aria-label={`Source ${index}`}
                            subtitle="Press to expand"
                            title={elementTitle}>
                            <div>{source.content ?? ""}</div>
                          </AccordionItem>);
                        }) ?? []}
                      </Accordion>
                    </CardBody>
                  </Card>
                </Tab>
              </Tabs>}


          </div>
        ))}
        {!hasFirstResponse && (<Spinner />)}
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
              handleSendMessage();
            }
          }}
          variant="bordered"
          disabled={isRecording}
        />
        <Button
          isIconOnly
          variant="bordered"
          aria-label={isRecording ? "Stop recording" : "Record audio"}
          color={isRecording ? "danger" : "default"}
          onClick={handleMicClick}
          disabled={true}
        >
          {isVoiceLoading ? <FaSpinner style={{ animation: "spin 1s infinite linear" }} /> : isRecording ? <FaStop /> : <FaMicrophone />}
        </Button>
        <Button
          color="primary"
          onClick={handleSendMessage}
          disabled={isRecording || (!inputValue?.trim() && !isLoading)}
        >
          Send
        </Button>
      </div>
    </Card>
  );
};
