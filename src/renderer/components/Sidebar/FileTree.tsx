import React, { useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { FileItem } from './FileItem';

export type TreeNode = {
  id: string;
  name: string;
  isFolder: boolean;
  path: string;
  children?: TreeNode[];
};

export const Tree = ({
  node,
  depth = 0,
  onDelete,
}: {
  node: TreeNode;
  depth?: number;
  onDelete?: (path: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (node.isFolder && node.children && node.children.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const indentStyle = { paddingLeft: `${depth * 20}px` };
  const canExpand = node.isFolder && node.children && node.children.length > 0;

  return (
    <div>
      {/* Add 'group' class here for hover detection */}
      <FileItem icon={node.isFolder ? '📁' : '📄'} id={node.id} name={node.name} depth={depth} handleClick={handleToggle} isExapndable={canExpand} isExpanded={isExpanded} onDelete={onDelete} />

      {node.isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <Tree
              key={child.id}
              node={child}
              depth={depth + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

