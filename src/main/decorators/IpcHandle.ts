import { ipcMain } from 'electron'

export function IpcHandle(channel: string) {
  // This is the decorator factory
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // This is the decorator function
    // It registers the decorated method with ipcMain.handle
    ipcMain.handle(channel, async (_, ...args: any[]) => {
      console.log(
        `IPC Handler [${channel}] received args:`,
        JSON.stringify(args)
      ) // Log received args
      try {
        return await descriptor.value.apply(target, args)
      } catch (error) {
        console.error(`Error in IPC Handler [${channel}]:`, error)
        throw error // Re-throw error to be caught by Electron/renderer
      }
    })
  }
}
