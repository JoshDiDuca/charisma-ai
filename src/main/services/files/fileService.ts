import { dialog } from 'electron';
import { createReadStream, promises as fs, Stats } from 'fs';
import path, { extname } from 'path';
import { fileTypeFromFile } from 'file-type';
import { logError } from '../log/logService';

export const MAX_FILE_SIZE = 100 * 1024 * 1024;

export let embedFolder: string | null = null;

export const selectEmbedFolder = async (): Promise<string | null> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  embedFolder = canceled ? null : filePaths[0];
  return embedFolder;
};

export type TreeNode = {
  id: string;
  name: string;
  isFolder: boolean;
  path: string;
  children?: TreeNode[];
};

export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const flatList: TreeNode[] = [];
  const stack: TreeNode[] = [...nodes];

  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;

    flatList.push(node);

    if (node.isFolder && node.children) {
      stack.unshift(...node.children);
    }
  }

  return flatList;
}


export async function readDirectoryNested(dirPath: string): Promise<TreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodePromises = entries.map(async (entry): Promise<TreeNode> => {
    const fullPath = path.join(dirPath, entry.name);
    const isFolder = entry.isDirectory();
    const node: TreeNode = {
      id: fullPath,
      name: entry.name,
      path: fullPath,
      isFolder: isFolder,
    };

    if (isFolder) {
      node.children = await readDirectoryNested(fullPath);
    }
    return node;
  });

  const nodes = await Promise.all(nodePromises);

  nodes.sort((a, b) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export async function readFileInChunks(filePath: string): Promise<string> {
    const stream = createReadStream(filePath, {
      encoding: 'utf-8',
      highWaterMark: 1024 * 1024
    });

    let content = '';

    for await (const chunk of stream) {
        content += chunk;
        if (content.length > 50 * 1024 * 1024) {
            stream.destroy();
            throw new Error('File exceeds 50MB limit');
        }
    }

    return content;
}

export async function getFileTree(startPath: string): Promise<TreeNode> {
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
    logError("Error reading directory.", { error, showUI: true });
    throw error;
  }
}

export const isPotentiallyBinaryFileByExtension = (filePath: string): boolean => {
  const binaryExtensions = new Set([
    '.dll', '.exe', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.ico',
    '.mp3', '.wav', '.ogg', '.flac', '.aac',
    '.mp4', '.avi', '.mov', '.mkv', '.webm',
    '.zip', '.rar', '.gz', '.tar', '.7z',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.sqlite', '.db', '.mdb',
    '.woff', '.woff2', '.ttf', '.otf', '.eot'
  ]);
  return binaryExtensions.has(extname(filePath).toLowerCase());
};

export const isLikelyTextFile = async (filePath: string): Promise<boolean> => {
  try {
    const type = await fileTypeFromFile(filePath);
    // If file-type detects a specific type, check if it starts with 'text/'
    // If file-type doesn't detect a type (returns undefined), assume it might be text
    // unless the extension strongly suggests otherwise.
    return !type || type.mime.startsWith('text/');
  } catch (error) {
    // If file-type fails (e.g., permissions), err on the side of caution?
    // Or assume text if extension isn't binary? Let's assume text for now.
    // console.warn(`Could not determine file type for ${filePath}:`, error);
    return !isPotentiallyBinaryFileByExtension(filePath);
  }
};

export async function shouldSkipFile(filePath: string, stats: Stats): Promise<boolean> {
  if (stats.isDirectory()) {
    return true;
  }
  if (stats.size > MAX_FILE_SIZE) {
    return true;
  }
  // Check potentially binary extension first as it's synchronous and faster
  if (isPotentiallyBinaryFileByExtension(filePath)) {
      // Double check with async check if extension seems binary
      if (!await isLikelyTextFile(filePath)) {
          return true;
      }
  } else {
      // If extension looks like text, still verify with async check
      if (!await isLikelyTextFile(filePath)) {
          return true;
      }
  }

  return false;
}
