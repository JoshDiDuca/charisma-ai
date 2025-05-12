import { parentPort, workerData } from 'worker_threads'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { logError, logInfo } from '../log/logService'
import { DownloadProgress, DownloadService } from 'main/download/DownloadService'
import { isNil } from 'lodash'
import getPlatform from '../platformService'
import { app } from 'electron'

export class PiperInstanceService {
  private downloadService = new DownloadService()
  private model = "en_GB-northern_english_male-medium.onnx"

  constructor() {

  }
  get binaryDir() {
    return path.join(app.getPath('userData'), 'piper-bin')
  }

  get execPath() {
    return path.join(
      this.binaryDir,
      process.platform === 'win32' ? 'piper.exe' : 'piper'
    )
  }

  get modelPath() {
    return path.join(this.binaryDir, this.model)
  }

  async start() {
    await this.ensurePiperBinary()
    await this.ensureModel()
  }

  private async ensurePiperBinary() {
    if (!(await this.needsUpdate())) return

    await fs.ensureDir(this.binaryDir)

    this.downloadService.on('progress', (progress: DownloadProgress) => {
      //logInfo(`piper-download Downloading Piper: ${progress.percentage}%`)
    })

    const downloadedPath = await this.downloadService.downloadLatest(
      'rhasspy/piper',
      this.binaryDir,
      undefined,
      true
    )

    if (process.platform !== 'win32') {
      await fs.chmod(downloadedPath, 0o755)
    }
  }

  private async ensureModel() {
    // First ensure the directory exists
    const modelDir = path.dirname(this.modelPath);
    await fs.promises.mkdir(modelDir, { recursive: true });

    const modelExists = await fs.pathExists(this.modelPath);
    if (!modelExists) {
      await this.downloadService.downloadFile(
        `https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/northern_english_male/medium/${this.model}`,
        this.modelPath
      );
    }
  }

  private async readStream(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = ''
      stream.on('data', chunk => data += chunk.toString())
      stream.on('end', () => resolve(data.trim()))
      stream.on('error', reject)
    })
  }

  private async needsUpdate(): Promise<boolean> {
    if (!await fs.pathExists(this.execPath)) return true
    const process = spawn(this.execPath, ['--version'])
    const installedVersion = await this.readStream(process.stdout)
    console.log(installedVersion);
    return !isNil(await this.downloadService.checkForUpdate('rhasspy/piper', installedVersion, true))
  }
}
