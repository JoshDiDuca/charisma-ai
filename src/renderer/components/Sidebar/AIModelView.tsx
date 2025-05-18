import React from 'react';
import { Card } from '@heroui/react';
import { CustomSelect } from '../Common/Select';
import { FaSpinner } from 'react-icons/fa';
import { OllamaModel } from 'shared/types/OllamaModel';

interface AIModelViewProps {
  model?: string;
  embeddingModel?: string;
  availableModels: OllamaModel[];
  availableEmbeddingModels: OllamaModel[];
  downloadModel: (modelName: string, type: 'LLM' | 'Embedding') => void;
}

export const AIModelView: React.FC<AIModelViewProps> = ({
  model,
  embeddingModel,
  availableModels,
  availableEmbeddingModels,
  downloadModel
}) => {
  return (
    <div className="p-4 rounded-none" style={{ height: "100%", minWidth: "400px" }}>
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">AI Settings</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Model</label>
          <CustomSelect
            value={model}
            onChange={(value) => downloadModel(value, 'LLM')}
            options={availableModels.map((m) => ({
              key: m.name,
              value: m.name,
              label: (
                <div className="flex items-center justify-between w-full">
                  <span>{m.name}{m.progress && m.progress < 100 && ` - ${m.progress.toFixed(1)}%`}</span>
                  <span>
                    {m.installed ? "✔️" : m.installing || (!!m.progress && m.progress < 100) ?
                      <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
                  </span>
                </div>
              )
            }))} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Embedding Model</label>
          <CustomSelect
            value={embeddingModel}
            onChange={(value) => downloadModel(value, 'Embedding')}
            options={availableEmbeddingModels.map((m) => ({
              key: m.name,
              value: m.name,
              label: (
                <div className="flex items-center justify-between w-full">
                  <span>{m.name}{m.progress && m.progress < 100 && ` - ${m.progress.toFixed(1)}%`}</span>
                  <span>
                    {m.installed ? "✔️" : m.installing || (!!m.progress && m.progress < 100) ?
                      <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
                  </span>
                </div>
              )
            }))} />
        </div>
      </div>
    </div>
  );
};
