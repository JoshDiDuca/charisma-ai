import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import PCMPlayer from 'pcm-player';
import { ENVIRONMENT, IPC } from 'shared/constants';
import { DEFAULT_VOLUME } from 'renderer/components/MediaPlayer';

interface AudioPlayerContextType {
  playerDisabled: boolean;
  isPlaying: boolean;
  volume: number;
  togglePlayer: () => void;
  setVolume: (volume: number) => void;
  player: PCMPlayer | null
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [playerDisabled, setPlayerDisabled] = useState(ENVIRONMENT.DISABLE_TTS_ON_START);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const playerRef = useRef<PCMPlayer | null>(null);

  const createNewPlayer = () => {
    return new PCMPlayer({
      inputCodec: 'Int16',
      channels: 1,
      sampleRate: 22050,
      flushTime: 100,
      fftSize: 1024
    });
  };

  // Initialize player on mount
  useEffect(() => {
    playerRef.current = createNewPlayer();
    console.log(playerRef.current.gainNode.gain.value);
    playerRef.current.volume(volume / 100);

    // Clean up on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleStreamStart = () => {
      setIsPlaying(true);
      console.log('Playing:', true);
    };

    const handleStreamEnd = () => {
      setIsPlaying(false);
      console.log('Playing:', false);
    };

    const handleAudioChunk = (pcmBuffer: ArrayBuffer) => {
      if (playerRef.current && !playerDisabled) {
        playerRef.current.feed(pcmBuffer);
      }
    };

    window.App.on(IPC.VOICE.STREAM_AUDIO_START, handleStreamStart);
    window.App.on(IPC.VOICE.STREAM_AUDIO_END, handleStreamEnd);
    window.App.on(IPC.VOICE.STREAM_AUDIO_CHUCK, handleAudioChunk);

    // Clean up event listeners
    return () => {
      window.App.removeAllListeners(IPC.VOICE.STREAM_AUDIO_START);
      window.App.removeAllListeners(IPC.VOICE.STREAM_AUDIO_END);
      window.App.removeAllListeners(IPC.VOICE.STREAM_AUDIO_CHUCK);
    };
  }, [playerDisabled]);

  const togglePlayer = () => {
    console.log("toggle");
    setPlayerDisabled(prevState => {
      const newState = !prevState;
      console.log('Player disabled:', newState);

      if (newState) {
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      } else {
        playerRef.current = createNewPlayer();
        playerRef.current.volume(volume / 100);
      }

      return newState;
    });
  };

  const setVolumeHandler = (vol: number) => {
    setVolume(vol);

    if (playerRef.current) {
      playerRef.current.volume(vol / 100);
    }
  };

  const value = {
    playerDisabled,
    isPlaying,
    togglePlayer,
    setVolume: setVolumeHandler,
    player: playerRef.current,
    volume
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = (): AudioPlayerContextType => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
