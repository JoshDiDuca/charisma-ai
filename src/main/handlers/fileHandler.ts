import { ipcMain } from 'electron'
import { getFileTree, selectEmbedFolder } from 'main/services/files/fileService'

export function initializeFileHandler() {
  ipcMain.handle('select-folder', async () => {
    return await selectEmbedFolder()
  })

  ipcMain.handle('get-folder-files', async (_, folderPath) => {
    return getFileTree(folderPath)
  })
}
