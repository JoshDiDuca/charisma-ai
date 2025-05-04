import { useEffect, useState, useRef } from 'react';
import { FaMicrophone, FaPaperclip, FaStop } from 'react-icons/fa';
import {
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Spacer,
  Spinner,
} from '@heroui/react';
import Markdown from 'react-markdown';
import { inc } from 'semver';
import { IPC } from 'shared/constants';
import { Conversation, Message } from 'shared/types/Conversation';
import { SettingsDropdown } from 'renderer/components/SettingsIcon';
import { useChatBot } from 'renderer/store/conversationProvider';
import { last } from 'lodash';

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

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFirstResponse, setHasFirstResponse] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Audio recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Handle microphone button click
  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      // We'll handle the rest in the onstop event handler
    } else {
      try {
        // Notify main process that we're starting recording
        await App.startRecording();

        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        streamRef.current = stream;

        // Create MediaRecorder instance
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        // Handle data available event
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // Handle recording stop event
        mediaRecorder.onstop = async () => {
          try {
            // Create audio blob from chunks
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

            // Convert blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);

            reader.onloadend = async () => {
              const base64Audio = reader.result?.toString().split(',')[1];

              if (base64Audio) {
                // Notify main process that recording stopped
                await App.stopRecording();

                setIsLoading(true);

                // Send audio for transcription
                const { text } = await App.transcribeAudio(base64Audio);

                // Set the transcribed text as input
                setInputValue(text);

                // Optionally auto-send the message
                // await handleSendMessage();
              }
            };

            // Clean up media stream
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
          } catch (error) {
            console.error('Error processing recording:', error);
          } finally {
            setIsRecording(false);
            setIsLoading(false);
            setHasFirstResponse(true);
          }
        };

        // Start recording
        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
        setIsRecording(false);
      }
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

  // Clean up recording on component unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
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
            <Markdown>{message.text}</Markdown>
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
          disabled={isLoading}
        >
          {isRecording ? <FaStop /> : <FaMicrophone />}
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
