import { ipcMain } from 'electron'
import { getFileTree, selectEmbedFolder } from 'main/services/files/fileService'
import { IpcHandle } from '../decorators/IpcHandle'
import { IPC } from 'shared/constants'
import { searchGoogle } from 'main/services/web/googleSevice'
import { addSources } from 'main/services/sources/sourceService'
import { SourceInput } from 'shared/types/Sources/SourceInput'

export class SourceHandlers {
  @IpcHandle(IPC.SOURCE.SELECT_FOLDER)
  async selectFolder() {
    return await selectEmbedFolder()
  }

  @IpcHandle(IPC.SOURCE.ADD_SOURCES)
  async addSources(input: SourceInput[], model: string, conversationId: string | undefined, systemMessage: string | undefined) {
    return addSources(input, model, conversationId, systemMessage)
  }

  @IpcHandle(IPC.SOURCE.QUERY)
  async searchQuery(query: string) {
    return searchGoogle(query)
  }
}
