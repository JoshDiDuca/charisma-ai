import { useState } from 'react'

export type TreeNode = {
  id: string
  name: string
  isFolder: boolean
  children: TreeNode[]
  path: string
}

export const Tree = ({
  node,
  depth = 0,
  onDelete,
}: {
  node: TreeNode
  depth?: number
  onDelete: (path: string) => void
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="group relative py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {node.isFolder && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-4 h-4 flex items-center justify-center"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}

        <span className="truncate" title={node.path}>
          {node.isFolder ? '📁' : '📄'} {node.name}
        </span>

        {isHovered && (
          <div className="absolute right-2 flex gap-1 bg-white dark:bg-gray-800">
            <button
              onClick={() => onDelete(node.path)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
            <button
              onClick={() => console.log('Rename', node.path)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Rename
            </button>
          </div>
        )}
      </div>

      {node.isFolder && isExpanded && (
        <div className="ml-4">
          {node.children.map((child) => (
            <Tree
              key={child.path}
              node={child}
              depth={depth + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const buildTreeStructure = (
  filePaths: string[],
  rootPath: string
): TreeNode[] => {
  const tree: TreeNode[] = []
  const pathMap = new Map<string, TreeNode>()

  filePaths.forEach((fullPath) => {
    const relativePath = fullPath
      .replace(rootPath, '')
      .split('/')
      .filter(Boolean)

    let currentParent: TreeNode | null = null
    let currentLevel = tree

    for (let index = 0; index < relativePath.length; index++) {
      const segment = relativePath[index]
      const pathSoFar = `${rootPath}/${relativePath
        .slice(0, index + 1)
        .join('/')}`

      if (!pathMap.has(pathSoFar)) {
        const node: TreeNode = {
          id: pathSoFar,
          name: segment,
          isFolder: index < relativePath.length - 1,
          children: [],
          path: pathSoFar,
        }

        pathMap.set(pathSoFar, node)

        if (currentParent) {
          currentParent.children.push(node)
        } else {
          currentLevel.push(node)
        }
      }

      currentParent = pathMap.get(pathSoFar) ?? null
      currentLevel = pathMap.get(pathSoFar)?.children ?? []
    }
  })

  return tree
}
