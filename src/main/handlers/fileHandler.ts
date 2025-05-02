import { ipcMain } from 'electron'
import { getFileTree, selectEmbedFolder } from 'main/services/files/fileService'
import { IpcHandle } from './IpcHandle'
import { IPC } from 'shared/constants'

export class FileHandlers {
  @IpcHandle(IPC.FILE.SELECT_FOLDER)
  async selectFolder() {
    return await selectEmbedFolder()
  }

  @IpcHandle(IPC.FILE.GET_FOLDER_FILES)
  async getFolderFiles(folderPath: string) {
    return getFileTree(folderPath)
  }
}
