import React, { useState } from 'react';
import { FaTrash } from 'react-icons/fa';

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
      <div
        className="group flex items-center gap-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
        style={indentStyle}
        onClick={handleToggle}
      >
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {node.isFolder ? (canExpand ? (isExpanded ? '▼' : '▶') : '') : ''}
        </span>

        <span className="flex-shrink-0">{node.isFolder ? '📁' : '📄'}</span>

        <span className="truncate flex-grow mr-2" title={node.path}>
          {node.name}
        </span>

        {/* Delete button: Start hidden (opacity-0), show on group-hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.path);
            }}
            className="text-red hover:text-red text-xs ml-auto mr-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 flex-shrink-0"
          >
            <FaTrash />
          </button>
        )}
      </div>

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
