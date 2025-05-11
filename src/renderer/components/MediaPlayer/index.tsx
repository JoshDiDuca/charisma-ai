import React, { useState, useRef, useEffect } from 'react';
import { FaPlay, FaPause, FaPowerOff, FaSpinner } from 'react-icons/fa';

interface MediaPlayerProps {
  label?: string;
  onTogglePower?: (isOn: boolean) => void;
  onTogglePlay?: (isPlaying: boolean) => void;
  onVolumeChange?: (volume: number) => void;
  playing?: boolean;
  isLoading?: boolean;
  poweredOn?: boolean;
  className?: string;
  volume?: number;
}

export const DEFAULT_VOLUME = 25;

export const MediaPlayer: React.FC<MediaPlayerProps> = ({
  label = 'TTS',
  onTogglePower,
  onTogglePlay,
  onVolumeChange,
  isLoading,
  playing,
  volume,
  poweredOn,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(playing);
  const [isPoweredOn, setIsPoweredOn] = useState(poweredOn);

  const togglePlay = () => {
    if (!isPoweredOn) return;
    onTogglePlay?.(!isPlaying);
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    onVolumeChange?.(newVolume);
  };

  const togglePower = () => {
    const newPowerState = !isPoweredOn;
    setIsPoweredOn(newPowerState);

    if (!newPowerState && isPlaying) {
      setIsPlaying(false);
    }

    if (onTogglePower) {
      onTogglePower(newPowerState);
    }
  };


  return (
    <div className={`flex items-center gap-3 p-3 ${className} ${!isPoweredOn || isLoading ? 'opacity-50' : ''}`}>
      <button
        onClick={togglePower}
        title='Power'
        className={`p-2 rounded-full ${isPoweredOn && !isLoading ? 'text-green-500' : 'text-gray-400'}`}
      >
        <FaPowerOff />
      </button>

      <button
        onClick={togglePlay}
        title='Play/Pause'
        disabled={!isPoweredOn}
        className={`p-2 rounded-full ${!isPoweredOn ? 'cursor-not-allowed' : ''}`}
      >
        {isLoading ? <FaSpinner /> : isPlaying ? <FaPause /> : <FaPlay />}
      </button>

      <input
        type="range"
        min={0}
        placeholder='Volume'
        max={100}
        value={volume}
        onChange={handleVolumeChange}
        disabled={!isPoweredOn || isLoading}
        className={`w-24 ${!isPoweredOn ? 'cursor-not-allowed' : ''}`}
      />

      <span className="ml-2 font-medium">{label}</span>
    </div>
  );
};
