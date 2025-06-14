import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { logInfo } from '../log/logService'
import { DownloadProgress, DownloadService } from 'main/download/DownloadService'
import { isNil } from 'lodash'
import { IPC } from 'shared/constants'
import { splashWindow } from 'main/windows/splash'
import { getPath } from '../files/fileService.directory'

export class PiperInstanceService {
  public downloadService = new DownloadService()
  private model = "en_GB-northern_english_male-medium.onnx"
  public ready = false


  constructor() {

  }
  get binaryDir() {
    return getPath("PiperBin");
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
    if (!(await this.needsUpdate())) {
      this.ready = true;
       return;
    }

    await fs.ensureDir(this.binaryDir)

    this.downloadService.on('progress', (progress: DownloadProgress) => {
      splashWindow?.webContents.send(IPC.CORE.UPDATE_SPLASH, `Downloading Piper: ${progress.percentage}%`);
      logInfo(`Downloading Piper: ${progress.percentage}`)
    })
    this.downloadService.on('done', (progress: DownloadProgress) => {
      this.ready = true;
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

  public async needsUpdate(): Promise<boolean> {
    if (!await fs.pathExists(this.execPath)) return true
    const process = spawn(this.execPath, ['--version'])
    const installedVersion = await this.readStream(process.stdout)
    console.log(installedVersion);
    return !isNil(await this.downloadService.checkForUpdate('rhasspy/piper', installedVersion, true))
  }
}
