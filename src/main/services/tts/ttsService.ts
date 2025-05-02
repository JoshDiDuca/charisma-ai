import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import getPlatform from '../platformService';
import { logError, logInfo } from '../log/logService';
import { mainWindow } from 'main/windows/main';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IPC } from 'shared/constants';

const execAsync = promisify(exec);

export class TTSInstanceService {
  private process: any;
  private isRunning: boolean = false;
  private onAudioChunk: (chunk: Buffer) => void = () => {};
  private modelToUse = "en_GB-northern_english_male-medium.onnx";

  getBinaryPath() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'bin', 'piper');
    } else {
      return path.join(app.getAppPath(), 'resources', getPlatform(), 'bin', 'piper');
    }
  }

  async isPiperRunning(): Promise<boolean> {
    try {
      const platform = process.platform;
      let cmd = '';

      if (platform === 'win32') {
        cmd = 'tasklist /FI "IMAGENAME eq piper.exe" /NH';
      } else if (platform === 'darwin' || platform === 'linux') {
        cmd = 'ps aux | grep piper | grep -v grep';
      } else {
        return false;
      }

      const { stdout } = await execAsync(cmd);
      return stdout.toLowerCase().includes('piper');
    } catch (error) {
      logError(`Error checking if Piper is running: ${error}`);
      return false;
    }
  }

  async streamPiperTTS(text: string, onAudioChunk: (chunk: Buffer) => void, onEnd: () => void) {
    logInfo(`tts ${text}`);
    if (!this.isRunning) {
      throw Error('TTS is not running');
    }

    this.onAudioChunk = onAudioChunk;
    this.process.stdin.write(text + '\n');

    this.process.stdout.on('end', () => {
      onEnd();
    });
  }

  async start() {
    // Check if already running internally
    if (this.isRunning) return true;

    // Check if piper is running as a separate process
    const piperAlreadyRunning = await this.isPiperRunning();
    if (piperAlreadyRunning) {
      this.isRunning = true;
      logInfo('Piper is already running in another process');
      return true;
    }

    const binaryPath = this.getBinaryPath();
    const execName = process.platform === 'win32' ? 'piper.exe' : 'piper';
    const fullPath = path.resolve(binaryPath, execName);
    const fullModelPath = path.resolve(binaryPath, this.modelToUse);

    console.log(`${fullPath} --model ${fullModelPath} --output_raw -`);

    this.process = spawn(fullPath, [
      '--model', fullModelPath,
      '--output_raw', '-'
    ]);
    logInfo(`Piper is running...`);

    this.process.stdout.on('data', (chunk: Buffer) => {
      if (Buffer.isBuffer(chunk)) {
        console.log("streaming audio");
        this.onAudioChunk(chunk);
        mainWindow?.webContents.send(IPC.VOICE.STREAM_AUDIO_CHUCK, chunk);
      } else {
        logError(`Piper error 1`);
      }
    });

    this.process.stderr.on('data', (err: Buffer | any) => {
      if (Buffer.isBuffer(err)) {
        console.log("streaming audio");
        this.onAudioChunk(err);
        mainWindow?.webContents.send(IPC.VOICE.STREAM_AUDIO_CHUCK, err);
      } else {
        logError(`Piper error 2`);
      }
    });

    this.isRunning = true;
    return true;
  }

  async stop() {
    if (!this.isRunning) return;
    this.process.kill();
    this.isRunning = false;
  }
}
