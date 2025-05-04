// src/main/services/TTSWorkerService.ts
import { Worker, parentPort } from 'worker_threads'
import path from 'path'
import { app, ipcMain } from 'electron'
import { mainWindow } from 'main/windows/main'
import { IPC } from 'shared/constants'

export class TTSWorkerService {
  private worker: Worker | null = null
  private port: MessagePort | null = null

  constructor() {
    this.initWorker()
  }

  cleanText(text: string) {
    return text.replaceAll("*", "").replaceAll("#", "").replaceAll("_", "").replaceAll(":", ".");
  }

  private initWorker() {
    const workerPath = path.join(__dirname, './tts_worker.js')
    this.worker = new Worker(workerPath, {
      workerData: {
        resourcesPath: app.isPackaged
          ? process.resourcesPath
          : path.join(app.getAppPath(), 'resources')
      }
    })

    this.worker.on('message', (msg: any) => {
      switch (msg.type) {
        case 'chunk':
          mainWindow?.webContents.send(IPC.VOICE.STREAM_AUDIO_CHUCK, msg.data);
          break
        case 'error':
          mainWindow?.webContents.send(IPC.VOICE.STREAM_AUDIO_ERROR, msg.data);
          break
        case 'exit':
          mainWindow?.webContents.send(IPC.VOICE.STREAM_AUDIO_END, msg.data);
          break
      }
    })
  }

  public stream(text: string) {
    this.worker?.postMessage({
      type: 'stream',
      data: this.cleanText(text)
    })
  }

  public start() {
    this.worker?.postMessage({ type: 'start' })
  }

  public stop() {
    this.worker?.postMessage({ type: 'stop' })
    this.worker?.terminate()
  }
}
