import React from 'react';
import { Card } from '@heroui/react';
import { MultiButton } from '../MultiButton';
import { FileItem } from './FileItem';
import { Tree } from './FileTree';
import { Conversation } from 'shared/types/Conversation';
import { OllamaLibraryModel } from 'shared/types/OllamaModel';
import { CustomSelect } from '../Common/Select';
import { FaDownload, FaSpinner } from 'react-icons/fa';

interface ConfigProps {
  conversation: Conversation | undefined;
  handleSelectSources: (type: "Folder" | "File") => void;
  setSearchOpen: (isOpen: boolean) => void;
  model?: string;
  embeddingModel?: string;
  availableModels: OllamaLibraryModel[];
  availableEmbeddingModels: OllamaLibraryModel[];
  downloadModel: (modelName: string, type: 'LLM' | 'Embedding') => void;
}

export const Config: React.FC<ConfigProps> = ({
  conversation,
  handleSelectSources,
  setSearchOpen,
  model,
  embeddingModel,
  availableModels,
  availableEmbeddingModels,
  downloadModel
}) => {
  return (
    <>
      <div className="p-4 rounded-none" style={{ height: "100%", minWidth: "400px" }}>
        <div className="flex flex-col gap-4 mb-4">
          <h2 className="text-lg font-bold">AI Settings</h2>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Model</label>
            <CustomSelect
              value={model}
              onChange={(value) => downloadModel(value, 'LLM')}
              options={[...availableModels]
                .sort((a, b) => {
                  // Sort: installed first, then installing, then others
                  const aStatus = (a.installed ? 0 : a.installing ? 1 : 2);
                  const bStatus = (b.installed ? 0 : b.installing ? 1 : 2);
                  return aStatus - bStatus;
                })
                .map((m) => ({
                  key: m.name,
                  value: m.name,
                  label: (
                    <div key={m.name} onClickCapture={() => downloadModel(m.name, 'LLM')}>
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-col" style={{ width: "100%" }}>
                          <div className="text-small">
                            {m.name}
                            <div style={{ marginLeft: "5px", float: "right" }}>
                              {m.installed ? ("") : m.installing || (!!m.progress && m.progress < 100) ?
                                <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : (<FaDownload />)}
                            </div>
                          </div>

                          <span className="text-tiny text-default-400 mt-1">{m.description}</span>
                          <div className="grid grid-cols-2 mt-2">
                            <p className="text-tiny text-default-400">Last Updated: {m.lastUpdated}</p>
                            {m.size && <p className="text-tiny text-default-400">Size: {m.size}</p>}
                            <p className="text-tiny text-default-400">Pull Count: {m.pullCount}</p>
                            <p className="text-tiny text-default-400">Tag Count: {m.tagCount}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                  selectedLabel: (
                    <div className="flex items-center justify-between w-full">
                      <span>{m.name}{m.progress && m.progress < 100 && ` - ${m.progress.toFixed(1)}%`}</span>
                      <span>
                        {m.installed ? "✔️" : m.installing || (!!m.progress && m.progress < 100) ?
                          <FaSpinner style={{ animation: "spin 1s infinite linear", display: "inline" }} /> : "❌"}
                      </span>
                    </div>
                  )
                }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Embedding Model</label>
            <CustomSelect
              value={embeddingModel}
              onChange={(value) => downloadModel(value, 'Embedding')}
              options={[...availableEmbeddingModels]
                .sort((a, b) => {
                  // Sort: installed first, then installing, then others
                  const aStatus = a.name === embeddingModel ? 0 : (a.installed ? 0 : a.installing ? 1 : 2);
                  const bStatus = (b.installed ? 0 : b.installing ? 1 : 2);
                  return aStatus - bStatus;
                })
                .map((m) => ({
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

        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="text-lg font-bold">Sources</h2>
          <MultiButton options={{
            file: {
              label: "Add Files",
              description: "Add sources from your PC.",
              onClick: () => handleSelectSources("File"),
              disabled: false
            },
            folder: {
              label: "Add Folder",
              description: "Add sources from your PC.",
              onClick: () => handleSelectSources("Folder"),
              disabled: false
            },
            web: {
              label: "Add Web",
              description: "Search, find and add sources from the internet.",
              onClick: () => setSearchOpen(true),
              disabled: false
            },
            database: {
              label: "Add Database",
              description: "Connect to a relational database and search data.",
              onClick: () => { },
              disabled: true
            }
          }} />
        </div>
        <Card className="p-2 flex-grow overflow-y-auto rounded-none" style={{ minHeight: "100%" }}>
          <div className="text-sm">
            {
              conversation?.sources &&
              conversation.sources.map((source) => {
                switch (source.type) {
                  case 'Directory':
                    return source.fileTree && <Tree node={source.fileTree} />;
                  case 'Web':
                    return (<div><FileItem icon={'🌍'} id={source.url} name={source.title} depth={0} isExpandable={false} isExpanded={false} /></div>)
                  case 'FilePath':
                    return (<div><FileItem icon={'🗃️'} id={source.filePath} name={source.fileName} depth={0} isExpandable={false} isExpanded={false} /></div>)
                }
              })
            }
          </div>
        </Card>
      </div>
    </>
  );
};
