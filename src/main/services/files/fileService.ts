import { dialog } from 'electron'
import { createReadStream, promises as fs, Stats } from 'fs'
import path, { extname } from 'path'
import { logError } from '../log/logService'
import { fileTypeFromFile } from 'file-type';

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export let embedFolder: string | null = null

export const selectEmbedFolder = async (): Promise<string | null> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  })
  const folderPath = (embedFolder = canceled ? null : filePaths[0])
  return folderPath
}

export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const flatList: TreeNode[] = [];

  function traverse(node: TreeNode) {
    flatList.push(node);
    if (node.isFolder && node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return flatList;
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

export async function readFileInChunks(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const stream = createReadStream(filePath, {
      encoding: 'utf-8',
      highWaterMark: 1024 * 1024 // 1MB chunks
    });

    let content = '';
    stream.on('data', chunk => {
      content += chunk;
      // Prevent memory overload
      if (content.length > 50 * 1024 * 1024) {
        stream.destroy();
        reject(new Error('File exceeds 50MB limit'));
      }
    });

    stream.on('end', () => resolve(content));
    stream.on('error', reject);
  });
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
    logError("Error reading directory.", { error, throwError: true, showUI: true });
    throw error;
  }
}

export const isBinaryFile = (filePath: string) => {
  const binaryExtensions = new Set([
    '.dll', '.exe', '.so', '.dylib', '.bin',
    '.png', '.jpg', '.jpeg', '.gif'
  ]);
  return binaryExtensions.has(extname(filePath).toLowerCase());
};

export const isTextFile = async (file: string) => {
  const type = await fileTypeFromFile(file);
  return !type?.mime.startsWith('text/') ? false : true;
};


// Helper functions
export function shouldSkipFile(file: string, stats: Stats) {
  return stats.isDirectory() ||
    isBinaryFile(file) ||
    !isTextFile(file) ||
    stats.size > MAX_FILE_SIZE;
}
