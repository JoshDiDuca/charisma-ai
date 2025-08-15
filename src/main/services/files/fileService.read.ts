import { dialog } from 'electron';
import { createReadStream, promises as fs, Stats } from 'fs';
import fsOrginal from 'fs';
import pdfParse from 'pdf-parse';
import path, { extname } from 'path';
import { fileTypeFromFile } from 'file-type';
import { logError, logInfo } from '../log/logService';
import { promisify } from 'util';
import mammoth from 'mammoth';
import { ENVIRONMENT } from 'shared/constants';
import { getSettings } from '../settings/settingsService';

export const MAX_FILE_SIZE = 100 * 1024 * 1024;

export let embedFolders: string[] | null = null;

export const selectEmbedFolder = async (openFolder?: boolean): Promise<string[] | null> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  embedFolders = canceled ? null : filePaths;
  return embedFolders;
};

export const selectEmbedFile = async (): Promise<string[] | null> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  });
  return canceled ? null : filePaths;
}

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

export const shouldSkipName = async (name: string) => {
  const settings = await getSettings()
  console.log(`Checking if should skip: ${name} ${settings?.ignorePaths}`);
  return settings?.ignorePaths?.some((skip) => name === skip);
}

export async function readDirectoryNested(dirPath: string): Promise<TreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodePromises = entries.map(async (entry): Promise<TreeNode | undefined> => {
    const isFolder = entry.isDirectory();
    if (isFolder && await shouldSkipName(entry.name)) {
      logInfo(`Skipping: ${entry.name}`);
      return undefined;
    }
    const fullPath = path.join(dirPath, entry.name);
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

  return (nodes.filter(e => e) as TreeNode[]).sort((a, b) => {
    if (a.isFolder !== b.isFolder) {
      return a.isFolder ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
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

export const isBinaryFileByExtension = (filePath: string): boolean => {
  const binaryExtensions = new Set([
    '.dll', '.exe', '.so', '.dylib', '.bin', '.obj', '.o', '.a', '.lib',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.ico',
    '.mp3', '.wav', '.ogg', '.flac', '.aac',
    '.mp4', '.avi', '.mov', '.mkv', '.webm',
    '.zip', '.rar', '.gz', '.tar', '.7z',
    '.sqlite', '.db', '.mdb',
    '.woff', '.woff2', '.ttf', '.otf', '.eot', '.bin'
  ]);
  console.log(extname(filePath))
  return binaryExtensions.has(extname(filePath).toLowerCase());
};

export const isTextFile = async (filePath: string): Promise<boolean> => {
  try {
    const type = await fileTypeFromFile(filePath);
    return !type || type.mime.startsWith('text/');
  } catch (error) {
    logError(`Failed to determine file type: ${filePath}`, { error, category: "FileProcessing", showUI: false });
    return false;
  }
};

export const isPdfFile = async (filePath: string): Promise<boolean> => {
  try {
    const type = await fileTypeFromFile(filePath);
    if (!type) return false;
    return type.mime?.startsWith('application/pdf') ?? false;
  } catch (error) {
    logError(`Failed to determine file type: ${filePath}`, { error, category: "FileProcessing", showUI: false });
    return false;
  }
};

export const isDocFile = async (filePath: string): Promise<boolean> => {
  try {
    const ext = extname(filePath).toLowerCase();
    const type = await fileTypeFromFile(filePath);
    if (!type) return false;
    return type.mime.startsWith('application/msword')
      || type.mime.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      || ext === '.doc' || ext === '.docx';
  } catch (error) {
    logError(`Failed to determine file type: ${filePath}`, { error, category: "FileProcessing", showUI: false });
    return false;
  }
};

export async function shouldSkipFile(filePath: string, stats?: Stats): Promise<boolean> {
  stats = (stats ?? await fs.stat(filePath));
  if(await shouldSkipName(path.basename(filePath))) {
    return true;
  }
  if (stats.isDirectory()) {
    return true;
  }
  if (isBinaryFileByExtension(filePath)) {
    return true;
  }
  if (stats.size > MAX_FILE_SIZE) {
    return true;
  }

  if (await isPdfFile(filePath)) {
    return false;
  }
  if (await isDocFile(filePath)) {
    return false;
  }
  if (await isTextFile(filePath)) {
    return false;
  }

  return true;
}



export async function readPdfFile(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    logError(`Failed to read PDF file using pdf-parse: ${filePath}`, { error, category: "FileProcessing", showUI: false });
    return '';
  }
}

async function readWordFile(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
  } catch (error) {
    logError(`Failed to read Word file using mammoth: ${filePath}`, { error, category: "FileProcessing", showUI: false });
    return '';
  }
}

export async function readBinaryFileAsBase64(filePath: string): Promise<string> {
  try {
    const data = await fs.readFile(filePath);
    return data.toString('base64');
  } catch (error) {
    logError(`Failed to read binary file as Base64: ${filePath}`, { error, category: "FileProcessing", showUI: false });
    return '';
  }
}

export async function readTextFileSimple(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    if (Buffer.byteLength(content, 'utf8') > MAX_FILE_SIZE * 0.5) {
      logInfo(`Large text file encountered, might consume significant memory: ${filePath}`);
    }
    return content;
  } catch (error) {
    logError(`Failed to read text file: ${filePath}`, { error, category: "FileProcessing", showUI: false });
    return '';
  }
}

export async function readFileByExtension(filePath: string): Promise<string | undefined> {
  if (await isPdfFile(filePath)) {
    logInfo(`Reading PDF: ${filePath}`);
    return await readPdfFile(filePath);
  } else if (await isDocFile(filePath)) {
    logInfo(`Reading Word Document: ${filePath}`);
    return await readWordFile(filePath);
  } else if (await isTextFile(filePath)) {
    logInfo(`Reading Text File: ${filePath}`);
    return await readTextFileSimple(filePath);
  }
  return undefined;
}


export const getFileInfo = async (filePath: string, useStats?: fsOrginal.Stats) => {
  const stats = useStats ?? await fsOrginal.promises.stat(filePath);

  return {
    filePath: filePath,
    fileName: path.basename(filePath),
    type: extname(filePath).toLowerCase(),
    fileSize: stats.size,
    fileType: path.extname(filePath),
    lastModified: stats.mtime,
    fileNameWithoutExtension: path.basename(filePath, path.extname(filePath))
  };
}


export const getDirectoryInfo = async (directoryPath: string, useStats?: fsOrginal.Stats) => {
  const stats = useStats ?? await fsOrginal.promises.stat(directoryPath);

  return {
      directoryName: path.dirname(directoryPath),
      directoryPath: directoryPath,
      lastModified: stats.mtime,
      directorySize: stats.size,
  };
}
