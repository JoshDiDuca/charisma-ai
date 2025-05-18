import React from 'react';
import { Card } from '@heroui/react';

interface SettingsViewProps {
  status: any;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  status
}) => {
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
      </div>
    </div>
  );
};
