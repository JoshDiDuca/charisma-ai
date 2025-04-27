import { dialog } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { logError } from './log/logService'

export let embedFolder: string | null = null

export const selectEmbedFolder = async (): Promise<string | null> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  const folderPath = (embedFolder = canceled ? null : filePaths[0])
  return folderPath
}

export async function recursiveReadDir(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name)
      return entry.isDirectory() ? recursiveReadDir(fullPath) : fullPath
    })
  )
  const flatFiles = files.flat()
  return [...flatFiles]
}

export type TreeNode = {
  id: string;
  name: string;
  isFolder: boolean;
  path: string;
  children?: TreeNode[];
};

export async function readDirectoryNested(dirPath: string): Promise<TreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const node: TreeNode = {
      id: fullPath, // Use fullPath as a unique ID
      name: entry.name,
      path: fullPath,
      isFolder: entry.isDirectory(),
    };

    if (node.isFolder) {
      // If it's a directory, recursively call to get its children
      node.children = await readDirectoryNested(fullPath);
    }
    // If it's a file, node.children remains undefined

    nodes.push(node);
  }

  // Optional: Sort entries alphabetically, folders first
  nodes.sort((a, b) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1; // Folders come before files
    }
    return a.name.localeCompare(b.name); // Sort by name otherwise
  });

  return nodes;
}

export async function getFileTree(startPath: string) {
  try {
    const absoluteStartPath = path.resolve(startPath);
    const rootName = path.basename(absoluteStartPath);
    const children = await readDirectoryNested(absoluteStartPath);

    const rootNode: TreeNode = {
      id: absoluteStartPath,
      name: rootName || 'Root',
      isFolder: true,
      path: absoluteStartPath,
      children: children
    };
    return rootNode;

  } catch (error) {
    logError("Error reading directory structure:", { error, throwError: true });
    throw error;
  }
}
