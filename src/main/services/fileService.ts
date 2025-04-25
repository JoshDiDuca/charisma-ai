import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { loadOllamaEmbedding } from './ollama/ollamaEmbeddingService'

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
  return files.flat()
}
