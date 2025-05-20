import { ChildProcessByStdio, ChildProcessWithoutNullStreams, spawn } from 'child_process'
import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'
import { getEligibleGpu } from '../gpuService'
import { logError, logInfo } from '../log/logService'
import { getOllamaStatus } from './ollamaService'
import { DownloadProgress, DownloadService } from 'main/download/DownloadService'
import { isNil } from 'lodash'
import { Readable } from 'stream'
import { splashWindow } from 'main/windows/splash'
import { IPC } from 'shared/constants'
import { getPath } from '../files/fileService.directory'

export class OllamaInstanceService {
  private process: ChildProcessByStdio<null, Readable, Readable> | null = null;
  private isRunning = false
  public ready = false
  public downloadService = new DownloadService()

  get binaryDir() {
    return getPath("OllamaBin");
  }

  get execPath() {
    return path.join(
      this.binaryDir,
      process.platform === 'win32' ? 'ollama.exe' : 'ollama'
    )
  }

  async start() {
    if (this.isRunning) return true

    if (await getOllamaStatus()) {
      this.isRunning = true
      return true
    }

    await this.ensureOllamaBinary()
    await this.spawnOllamaProcess()
    return true
  }

  private async ensureOllamaBinary() {
    if (!(await this.needsUpdate())) {
      this.ready = true;
       return;
    }

    await fs.ensureDir(this.binaryDir)

    this.downloadService.on('progress', (progress: DownloadProgress) => {
      splashWindow?.webContents.send(IPC.CORE.UPDATE_SPLASH, `Downloading Ollama: ${progress.percentage}%`);
      logInfo(`Downloading Ollama: ${progress.percentage}`)
    })
    this.downloadService.on('done', (progress: DownloadProgress) => {
      this.ready = true;
    })

    const downloadedPath = await this.downloadService.downloadLatest(
      'ollama/ollama',
      this.binaryDir
    )

    if (process.platform !== 'win32') {
      await fs.chmod(downloadedPath, 0o755)
    }
  }

  private async readStream(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''

    stream.on('data', chunk => {
      data += chunk.toString()
    })

    stream.on('end', () => {
      resolve(data.trim())
    })

    stream.on('error', error => {
      reject(error)
    })
  })
}

  private async needsUpdate(): Promise<boolean> {
    if (!await fs.pathExists(this.execPath)) return true

    const process = spawn(this.execPath, ['--version'])
    const installedVersion = await this.readStream(process.stdout);
    return !isNil(await this.downloadService.checkForUpdate('ollama/ollama', installedVersion));
  }

  private async spawnOllamaProcess() {
    const eligibleGpu = await getEligibleGpu()

    this.process = spawn(this.execPath, ['serve'], {
      env: {
        ...process.env,
        OLLAMA_EXPERIMENTAL: 'client2',
        ...(eligibleGpu && { CUDA_VISIBLE_DEVICES: eligibleGpu.uuid })
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    this.process.stdout.on('data', (data: Buffer) => {
      logInfo(`Ollama: ${data.toString()}`, { category: "Ollama", logToConsole: false })
    })

    this.process.stderr.on('data', (data: Buffer) => {
      logError(`Ollama Error: ${data.toString()}`, { category: "Ollama", logToConsole: false })
    })

    this.process.on('exit', (code: number) => {
      this.isRunning = false
      logInfo(`Ollama process exited with code ${code}`, { category: "Ollama", logToConsole: false })
    })

    this.isRunning = true
  }

  async stop() {
    if (!this.isRunning) return
    this.process?.kill('SIGTERM')
    this.isRunning = false
  }
}
