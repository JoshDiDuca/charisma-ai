import React, { useState } from 'react';
import { Card, Checkbox, Input, Button } from '@heroui/react';
import { useSettings } from 'renderer/store/settingsProvider';
import { FaTrash } from 'react-icons/fa';

interface SettingsViewProps {
  status: any;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  status
}) => {
  const { settings, saveSettings } = useSettings();
  const [currentPath, setCurrentPath] = useState('');

  const addIgnorePath = () => {
    if (currentPath.trim() && !settings?.ignorePaths?.includes(currentPath.trim())) {
      const updatedPaths = [...(settings?.ignorePaths || []), currentPath.trim()];
      saveSettings({...settings, ignorePaths: updatedPaths});
      setCurrentPath('');
    }
  };

  const removeIgnorePath = (pathToRemove: string) => {
    const updatedPaths = settings?.ignorePaths?.filter(path => path !== pathToRemove) || [];
    saveSettings({...settings, ignorePaths: updatedPaths});
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addIgnorePath();
    }
  };

  const getStatusDisplay = () => {
    if (typeof status === 'string') {
      return {
        text: status,
        color: status === 'Error' ? 'red' : 'green',
      };
    } else {
      const noDB = status.Database === 'Stopped';
      const runningText = `Running (${status.GPU ? 'GPU' : 'CPU'})`;
      const embeddingText = noDB ? ' - No Embedding' : '';
      return {
        text: runningText + embeddingText,
        color: noDB ? 'orange' : 'green',
      };
    }
  };

  const { text: statusText, color: statusColor } = getStatusDisplay();

  return (
    <div className="p-4 rounded-none" style={{ height: "100%", minWidth: "400px" }}>
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Settings</h2>
        <div className="inline-flex items-center mb-4">
          <span className="text-sm font-medium">
            Status: <b style={{ color: statusColor }}>{statusText}</b>
          </span>
        </div>
        <div className="inline-flex items-center mt-2 mb-1">
          <span className="text-sm font-medium">
            <Checkbox defaultSelected={settings?.darkMode} onChange={(e) => saveSettings({...settings, darkMode: e.target.checked })}>Dark Mode</Checkbox>
          </span>
        </div>
        <div className="inline-flex items-center mt-2 mb-1">
          <span className="text-sm font-medium">
            <Checkbox defaultSelected={settings?.useChromeLogo} onChange={(e) => saveSettings({...settings, useChromeLogo: e.target.checked })}>Use Chrome Logo</Checkbox>
          </span>
        </div>
        <div className="mt-4">
          <span className="text-sm font-medium mb-2 block">Ignore Paths</span>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Enter path to ignore..."
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={addIgnorePath} disabled={!currentPath.trim()}>
              Add
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            {settings?.ignorePaths?.map((path, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded p-2">
                <span className="text-sm">{path}</span>
                <Button
                  size="sm"
                  color="danger"
                  variant="light"
                  onClick={() => removeIgnorePath(path)}
                >
                  <FaTrash/>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
