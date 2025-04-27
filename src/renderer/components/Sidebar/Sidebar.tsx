import { Badge, Button, Card, Select, SelectItem } from '@heroui/react';
import { useEffect, useState } from 'react';
import { Tree, TreeNode } from './FileTree';
import { OllamaModel } from 'shared/types/OllamaModel';
import { IPC } from 'shared/constants';
import { FaSpinner } from 'react-icons/fa';
import { AppStatus } from 'shared/types/AppStatus';

const { App } = window;

export interface SidebarProps {
  model: string;
  embeddingModel: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  setEmbeddingModel: React.Dispatch<React.SetStateAction<string>>;
}

export const Sidebar = ({ model, embeddingModel, setModel, setEmbeddingModel }: SidebarProps) => {
  const [status, setStatus] = useState<AppStatus | string>('Loading...');
  const [filePath, setFilePath] = useState<string>('');
  const [files, setFiles] = useState<string[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<OllamaModel[]>([]);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [treeData, setTreeData] = useState<TreeNode>();

  const handleSelectFolder = async () => {
    const folder = await App.invoke('select-folder');
    if (!folder) return;

    setFilePath(folder);
    const fileList = await App.invoke('get-folder-files', folder);
    setTreeData(fileList);
  };

  const loadStatus = async () => {
    try {
      const response: AppStatus = await App.invoke('get-app-status');
      if (response) {
        setStatus(response.Ollama === 'Running' ? response : 'Stopped');
      } else {
        setStatus('Error');
      }
    } catch (error) {
      console.error("Failed to get app status:", error);
      setStatus('Error');
    }
  };

  const loadEmbeddingModels = async () => {
    const response: OllamaModel[] = await App.invoke('get-all-embedding-models');
    if (response) {
      setEmbeddingModels(response);
    }
  };

  const loadModels = async () => {
    const response: OllamaModel[] = await App.invoke('get-all-models');
    if (response) {
      setModels(response);
    }
  };

  useEffect(() => {
    const unlistenModels = App.on(IPC.LLM.UPDATE_ALL_MODELS, (response: OllamaModel[]) => {
      setModels(response);
    });

    const unlistenEmbeddingModels = App.on(IPC.LLM.UPDATE_ALL_EMBEDDING_MODELS, (response: OllamaModel[]) => {
      setEmbeddingModels(response);
    });

    return () => {
      App.removeAllListeners(IPC.LLM.UPDATE_ALL_MODELS);
      App.removeAllListeners(IPC.LLM.UPDATE_ALL_EMBEDDING_MODELS);
    };
  }, []);

  const downloadModel = async (modelName: string, type: 'LLM' | 'Embedding') => {
    await App.invoke('download-model', modelName);
    if (type === 'LLM') {
      setModel(modelName);
      loadModels();
    } else {
      setEmbeddingModel(modelName);
      loadEmbeddingModels();
    }
  };

  useEffect(() => {
    loadStatus();
    loadEmbeddingModels();
    loadModels();
  }, []);

  const getStatusDisplay = () => {
    if (typeof status === 'string') {
      return {
        text: status,
        color: status === 'Error' ? 'red' : 'green',
      };
    } else {
      const noChroma = status.ChromaDB === 'Stopped';
      const runningText = `Running (${status.GPU ? 'GPU' : 'CPU'})`;
      const embeddingText = noChroma ? ' - No Embedding' : '';
      return {
        text: runningText + embeddingText,
        color: noChroma ? 'orange' : 'green',
      };
    }
  };

  const { text: statusText, color: statusColor } = getStatusDisplay();

  return (
    <Card className="p-4 w-120" style={{ width: '30rem' }}>
      <div className="flex flex-col gap-4 h-screen">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center">
            <img
              src="/logo.png"
              width={25}
              height={25}
              alt="Logo"
              style={{ marginRight: '0.25rem' }}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Status:{' '}
                <b style={{ color: statusColor }}>
                  {statusText}
                </b>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Model</label>
          <Select value={model} onChange={(e) => downloadModel(e.target.value, 'LLM')}>
            {models.map((m) => (
              <SelectItem key={m.name} textValue={m.name}>
                {m.name} {m.installed ? "✔️" : m.installing ? <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Embedding Model</label>
          <Select value={embeddingModel} onChange={(e) => downloadModel(e.target.value, 'Embedding')}>
            {embeddingModels.map((m) => (
              <SelectItem key={m.name} textValue={m.name}>
                {m.name} {m.installed ? "✔️" : m.installing ? <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
              </SelectItem>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2 flex-grow">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Files:</label>
            <Button variant="light" size="sm" onClick={handleSelectFolder}>Add Folder</Button>
          </div>
          <Card className="p-2 flex-grow overflow-y-auto" style={{ minHeight: '200px' }}>
            <div className="text-sm">
              {treeData ? (
                <Tree node={treeData} onDelete={(_) => { }} />
              ) : (
                <span className="text-gray-500">No folder selected.</span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
};

export default Sidebar;
