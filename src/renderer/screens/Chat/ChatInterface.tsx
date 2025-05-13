import { useEffect, useState } from 'react';
import { FaMicrophone, FaPaperclip, FaSpinner, FaStop } from 'react-icons/fa';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import {
  Button,
  Input,
  Card,
  CardBody,
  Spinner,
  Tabs,
  Tab,
  Accordion,
  AccordionItem,
  toast,
} from '@heroui/react';
import { addToast } from '@heroui/react'
import Markdown from 'react-markdown';
import { IPC } from 'shared/constants';
import { Conversation, Message } from 'shared/types/Conversation';
import { SettingsDropdown } from 'renderer/components/SettingsIcon';
import { useChatBot } from 'renderer/store/conversationProvider';
import { get, isNil, last } from 'lodash';
import { useVoiceRecorder } from 'renderer/hooks/useVoiceRecorder';
import { error } from 'console';
import "./Chat.scss";
import CopyCodeButton from 'renderer/components/Chat/Markdown/CopyCodeButton';
import { preprocessMarkdownText } from 'renderer/components/Chat/Markdown/utils';

const { App } = window;

export interface ChatInterfaceProps {
}

export const ChatInterface = ({
}: ChatInterfaceProps) => {
  const {
    model,
    availableModels,
    embeddingModel,
    availableEmbeddingModels,
    conversation,
    setMessages,
    setConversation,
    loadConversations,
    messages
  } = useChatBot();


  const {
    isLoading: isVoiceLoading,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceRecorder((transcribedText) => setInputValue(transcribedText));

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
    const inputValueTrimmed = inputValue.trim();

    if (isNil(inputValueTrimmed) || inputValueTrimmed === "" || isLoading) return;

    if (isNil(model) || model === "" || availableModels.filter(e => !e.installed).map(e => e.name).includes(model)) {
      addToast({ title: "Please select a model." })
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
      const lastMessage = last(response.messages.filter(m => m.role === 'assistant'))
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
  }


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
      className="p-4 pt-2 rounded-none inset-shadow-lg"
      style={{ height: '100vh', width: '100%', overflowY: 'auto' }}
    >
      <SettingsDropdown />
      <CardBody
        className="flex-1 flex flex-col gap-2 bg-default-200 mb-2 p-4 w-100"
        style={{ overflowY: 'auto' }}
      >
        {messages.map((message) => (
          <div
            key={message.timestamp}
            style={{ userSelect: "text" }}
            className={`max-w-[80%] px-4 py-2 rounded-large ${message.role === 'user'
              ? 'self-end bg-primary text-primary-foreground'
              : 'self-start bg-default-300 text-default-foreground'
              }`}
          >
            {(message.role === 'user') ?
              <Markdown>{message.userInput || message.text}</Markdown>
              :
              <Tabs aria-label="Options">
                <Tab key="answer" title="Answer">
                  <Card>
                    <CardBody>
                      <Markdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          // Existing code component
                          code(props) {
                            const { children, className, node, ...rest } = props
                            const match = /language-(\w+)/.exec(className || '')
                            return match ? (
                              <div style={{ position: 'relative' }}>
                                <CopyCodeButton code={String(children)}>{children}</CopyCodeButton>
                                <SyntaxHighlighter language={match[1]} {...props}>
                                  {String(children)}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code {...rest} className={className}>
                                {children}
                              </code>
                            )
                          },
                          // Add custom paragraph component for better spacing
                          p: ({ node, children, ...props }) => (
                            <p style={{ marginBottom: "1em" }} {...props}>{children}</p>
                          ),
                          // Add proper handling for line breaks
                          br: () => <br style={{ marginBottom: "0.5em" }} />
                        }}
                      >
                        {preprocessMarkdownText(message.userInput || message.text)}
                      </Markdown>

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
      <div id='message-input-container' className="flex items-center gap-2 mb-2">
        <Button isIconOnly variant="bordered" aria-label="Attach file">
          <FaPaperclip />
        </Button>
        <Input
          className="flex-1 w-100"
          id='message-input'
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
