// SettingsDropdown.tsx
import React from 'react';
import { FaCog, FaUser, FaLanguage, FaFileAlt, FaInfoCircle } from 'react-icons/fa';
import { CustomDropdown } from '../Common/Dropdown';
import { MediaPlayer } from '../MediaPlayer';
import { useAudioPlayer } from 'renderer/scripts/audioRenderer';
import { IPC } from 'shared/constants';

interface SettingsDropdownProps {
  className?: string;

}

const { App } = window;

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({ className = '' }) => {

  const { isPlaying, player, playerDisabled, volume, setVolume, togglePlayer } = useAudioPlayer();
   const handleItemClick = (action: string) => {
    console.log(`Action clicked: ${action}`);
    // Implement your action handlers here
  };
  return (
    <CustomDropdown
      className={className}
      trigger={
        <div className="p-2 rounded-full hover:bg-gray-100">
          <FaCog className='float-right' style={{ float:"right", marginBottom: "0.5rem", marginTop: "0rem"}} size={20} />
        </div>
      }
    >
      <div className="py-2">
        <div className="px-4 py-2 text-sm font-medium border-b">Settings</div>

{/*         <div className="mt-2">
          <div
            className="px-4 py-2 flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => handleItemClick('profile')}
          >
            <FaUser size={16} />
            <span>Profile Settings</span>
          </div>

          <div
            className="px-4 py-2 flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => handleItemClick('language')}
          >
            <FaLanguage size={16} />
            <span>Language Settings</span>
          </div>

          <div
            className="px-4 py-2 flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => handleItemClick('documents')}
          >
            <FaFileAlt size={16} />
            <span>Document Settings</span>
          </div>
        </div> */}

        <div className="border-t mt-2">
          <MediaPlayer
            poweredOn={!playerDisabled}
            playing={isPlaying}
            volume={volume}
            onVolumeChange={(volume) => setVolume(volume)}
            onTogglePlay={(isPlaying) => isPlaying ? player?.continue() : player?.pause()}
            onTogglePower={(_isOn) => {
              togglePlayer();
              window.App.invoke(IPC.VOICE.TOGGLE_TEXT_TO_SPEECH);
            }}
          />
        </div>

        <div className="border-t mt-2">
          <div
            className="px-4 py-2 flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => handleItemClick('about')}
          >
            <FaInfoCircle size={16} />
            <span>About</span>
          </div>
        </div>
      </div>
    </CustomDropdown>
  );
};
