import { contextBridge, ipcRenderer } from 'electron'

declare global {
  interface Window {
    App: typeof API
  }
}

const API = {
  checkBridge: () => console.log('\nBridge Working Fine! 👋\n\n'),
  username: process.env.USER,
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => listener(...args))
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },

  // Audio recording methods
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  transcribeAudio: (audioData: string) => ipcRenderer.invoke('transcribe-audio', audioData),
}

contextBridge.exposeInMainWorld('App', API)
