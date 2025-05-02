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
import { Conversation } from 'shared/types/Conversation';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  incomplete: boolean;
};

const { App } = window;

export interface ChatInterfaceProps {
  model: string;
  embeddingModel: string;
  conversation?: Conversation;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  setEmbeddingModel: React.Dispatch<React.SetStateAction<string>>;
}

export const ChatInterface = ({
  model,
  embeddingModel,
  setModel,
  conversation,
  setEmbeddingModel,
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFirstResponse, setHasFirstResponse] = useState(true);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);

  // Audio recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
      setMessages(conversation?.messages.map((msg) => ({
        id: msg.timestamp,
        text: msg.content,
        sender: msg.role === 'user' ? 'user' : 'bot',
        incomplete: false
      })) ?? []);
      setConversationId(conversation?.id);
      if(conversation?.model){
        setModel(conversation.model);
      }
  }, [conversation])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user' as const,
      incomplete: false
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setHasFirstResponse(false);

    try {
      // Send message and receive stream
      const response = await App.invoke(
        IPC.LLM.SEND_MESSAGE,
        inputValue,
        model,
        conversationId
      );
      console.log(response);

      if (response && response.conversationId) {

        setConversationId(response.conversationId);

        // Add final message
        setMessages((prev) => [
          ...prev.filter(e => !e.incomplete),
          {
            id: Date.now(),
            text: response.content,
            sender: 'bot',
            incomplete: false
          },

        ]);
        await App.invoke(
          IPC.VOICE.TEXT_TO_SPEECH,
          response.content
        );
      } else {

        console.error('Chat error:');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: `Error: ${error}`,
          sender: 'bot',
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

      console.log(partial);
      setHasFirstResponse(true);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last?.incomplete) {
          return [
            ...prev,
            {
              id: Date.now(),
              text: partial ?? "",
              sender: 'bot',
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
            className={`max-w-[80%] px-4 py-2 rounded-large ${message.sender === 'user'
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
