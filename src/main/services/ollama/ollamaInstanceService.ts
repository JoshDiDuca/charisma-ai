import { spawn } from 'child_process'
import { app } from 'electron'
import path from 'path'
import { getEligibleGpu } from '../gpuService'
import { logError, logInfo } from '../log/logService'
import getPlatform from '../platformService'
import { getOllamaStatus } from './ollamaService'

export class OllamaInstanceService {
  private process: any
  private isRunning: boolean = false

  getBinaryPath() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'bin', 'ollama')
    } else {
      return path.join(app.getAppPath(), 'resources', getPlatform(), 'bin', 'ollama')
    }
  }
  async start() {
    if (this.isRunning) return

    const alreadyExists = await getOllamaStatus();

    if(alreadyExists) {
        this.isRunning = true;
        return true;
    }


    const binaryPath = this.getBinaryPath()
    const execName = process.platform === 'win32' ? 'ollama.exe' : 'ollama'
    const fullPath = path.join(binaryPath, execName)

    const eligibleGpu = await getEligibleGpu();

    this.process = spawn(fullPath, ['serve'], {
      stdio: ['ignore', 'pipe', 'pipe'], // stdin, stdout, stderr
      env: (eligibleGpu ? {
        "CUDA_VISIBLE_DEVICES": eligibleGpu.uuid
      } : {

      })
    })
    this.process.stdout.on('data', (data: any) => {
      logInfo(`stdout: ${data}`, { category: "Ollama" })
    })

    this.process.on('error', (err: any) => {
      logError('Error in ollama service',{ error: err, category : "Ollama"})
      this.isRunning = false
      throw err
    })

    this.isRunning = true
    return true
  }

  async stop() {
    if (!this.isRunning) return
    this.process.kill('SIGTERM');
    this.isRunning = false
  }
}
