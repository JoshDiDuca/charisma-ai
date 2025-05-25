import { parentPort, workerData } from 'worker_threads'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

interface TTSWorkerMessage {
  type: 'start' | 'stream' | 'stop' | 'status'
  data?: string | Buffer | Error
}

class TTSWorker {
  private process: ChildProcess | null = null
  private model = "en_GB-northern_english_male-medium.onnx"

  constructor() {
    this.setupListeners()
  }
  getBinaryPath() {
    return workerData.userData;
  }

  private startProcess() {
    const binaryPath = this.getBinaryPath()
    const execName = process.platform === 'win32' ? 'piper.exe' : 'piper'
    const fullPath = path.resolve(binaryPath, execName)
    const modelPath = path.resolve(binaryPath, this.model)

    console.log(fullPath, modelPath)

    this.process = spawn(fullPath, [
      '--model', modelPath,
      '--output_raw', '-'
    ])

    this.process.stdout?.on('data', (chunk: Buffer) => {
      parentPort?.postMessage({
        type: 'chunk',
        data: chunk
      })
    })

    this.process.stderr?.on('data', (err: Buffer) => {
      parentPort?.postMessage({
        type: 'error',
        data: new Error(err.toString())
      })
    })

    this.process.on('exit', (code) => {
      parentPort?.postMessage({
        type: 'exit',
        data: code
      })
    })
  }

  private handleStream(text: string) {
    if (!this.process?.stdin?.writable) {
      throw new Error('TTS process not writable')
    }
    this.process.stdin.write(text + '\n')
  }

  private setupListeners() {
    parentPort?.on('message', (msg: TTSWorkerMessage) => {
      switch (msg.type) {
        case 'start':
          this.startProcess()
          break
        case 'stream':
          if (typeof msg.data === 'string') {
            if(!this.process) {
              this.startProcess();
            }
            this.handleStream(msg.data)
          }
          break
        case 'stop':
          this.process?.kill()
          break
      }
    })
  }
}

// Initialize worker instance
new TTSWorker()
