import { promises as fsPromises } from 'fs';
import fs from 'fs';

/**
 * Asynchronously checks if file or directory exists
 */
export const exists = async (targetPath: string): Promise<boolean> => {
  try {
    await fsPromises.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Asynchronously deletes a file or folder (with all contents) after checking if it exists
 */
export const deleteFileOrFolder = async (targetPath: string): Promise<void> => {
  const fileExists = await exists(targetPath);

  if (!fileExists) {
    return;
  }

  try {
    const stats = await fsPromises.stat(targetPath);

    if (stats.isDirectory()) {
      await fsPromises.rm(targetPath, { recursive: true, force: true });
    } else {
      await fsPromises.unlink(targetPath);
    }
  } catch (error) {
    throw new Error(`Failed to delete ${targetPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Alternative implementation with synchronous existence check
 * but asynchronous deletion
 */
export const deleteFileOrFolderWithSyncCheck = async (targetPath: string): Promise<void> => {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  try {
    const stats = await fsPromises.stat(targetPath);

    if (stats.isDirectory()) {
      await fsPromises.rm(targetPath, { recursive: true, force: true });
    } else {
      await fsPromises.unlink(targetPath);
    }
  } catch (error) {
    throw new Error(`Failed to delete ${targetPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
};
