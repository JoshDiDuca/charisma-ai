// services/ollama.ts
import { spawn } from 'child_process'
import { app } from 'electron'
import path from 'path'
import { rootPath } from 'electron-root-path'
import getPlatform from '../chroma/chromaInstanceService'
import { getEligibleGpu } from '../gpuService'

export class OllamaInstanceService {
  private process: any
  private isRunning: boolean = false

  getBinaryPath() {
    if (app.isPackaged) {
      console.log('OllamaInstancePath', path.join(process.resourcesPath, 'bin', 'ollama'));
      return path.join(process.resourcesPath, 'bin', 'ollama')
    } else {
      console.log('OllamaInstancePath', app.getAppPath());
      return path.join(app.getAppPath(), 'resources', getPlatform(), 'bin', 'ollama')
    }
  }

  async start() {
    if (this.isRunning) return

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
      console.log(`Ollama stdout: ${data}`)
    })

    this.process.stderr.on('data', (data: any) => {
      console.log(`Ollama stderr: ${data}`)
    })

    this.process.on('error', (err: any) => {
      console.error('Failed to start Ollama process:', err)
      this.isRunning = false
      throw err
    })

    this.isRunning = true
    return true
  }

  async stop() {
    if (!this.isRunning) return
    this.process.kill()
    this.isRunning = false
  }
}
