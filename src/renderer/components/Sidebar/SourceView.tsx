import React from 'react';
import { Card } from '@heroui/react';
import { MultiButton } from '../MultiButton';
import { FileItem } from './FileItem';
import { Tree } from './FileTree';
import { Conversation } from 'shared/types/Conversation';

interface SourcesViewProps {
  conversation: Conversation | undefined;
  handleSelectFolder: () => void;
  setSearchOpen: (isOpen: boolean) => void;
}

export const SourcesView: React.FC<SourcesViewProps> = ({
  conversation,
  handleSelectFolder,
  setSearchOpen
}) => {
  return (
    <div className="p-4 rounded-none" style={{ height: "100%", minWidth: "400px" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Sources</h2>
        <MultiButton options={{
          folder: {
            label: "Add Folder",
            description: "Add sources from a folder on your PC.",
            onClick: () => handleSelectFolder(),
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
      <Card className="p-2 flex-grow overflow-y-auto rounded-none">
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
  );
};
