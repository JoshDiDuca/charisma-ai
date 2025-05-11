import React, { useState } from 'react';
import { FaTrash } from 'react-icons/fa';

export const FileItem = ({
  icon,
  onDelete,
  isExpandable,
  isExpanded,
  depth = 0,
  handleClick,
  name,
  id
}: {
  icon: string | React.ReactNode;
  id: string;
  name: string;
  isExpandable?: boolean;
  isExpanded?: boolean;
  onDelete?: (path: string) => void;
  handleClick?: () => void;
  depth?: number;
}) => {

  const indentStyle = { paddingLeft: `${depth * 20}px` };
  const canExpand = isExpandable;

  return (
      <div
        className="group flex items-center gap-1 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
        style={indentStyle}
        onClick={handleClick}
      >
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {(canExpand ? (isExpanded ? '▼' : '▶') : '')}
        </span>

        <span className="flex-shrink-0">{icon}</span>

        <span className="truncate flex-grow mr-2" title={id}>
          {name}
        </span>

        {/* Delete button: Start hidden (opacity-0), show on group-hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="text-red hover:text-red text-xs ml-auto mr-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 flex-shrink-0"
          >
            <FaTrash />
          </button>
        )}
      </div>
  );
};

