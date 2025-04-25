import { ipcMain } from 'electron'
import { recursiveReadDir, selectEmbedFolder } from 'main/services/fileService'

export function initializeFileHandler() {
  ipcMain.handle('select-folder', async () => {
    return await selectEmbedFolder()
  })

  ipcMain.handle('get-folder-files', async (_, folderPath) => {
    return recursiveReadDir(folderPath)
  })
}
