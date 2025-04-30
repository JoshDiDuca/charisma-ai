import { spawn } from 'child_process';
import { app } from 'electron'
import path from 'path'
import getPlatform from '../platformService'
import { logError, logInfo } from '../log/logService';
import { mainWindow } from 'main/windows/main';

export class TTSInstanceService {
  private process: any
  private isRunning: boolean = false
  private onAudioChunk: (chunk: Buffer) => void = () => {};

  private modelToUse = "en_GB-northern_english_male-medium.onnx";

  getBinaryPath() {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'bin', 'piper')
    } else {
      return path.join(app.getAppPath(), 'resources', getPlatform(), 'bin', 'piper')
    }
  }

  async streamPiperTTS(text: string, onAudioChunk: (chunk: Buffer) => void, onEnd: () => void) {
    logInfo(`tts ${text}`)
    if (!this.isRunning){
      throw Error('TTS is not running');
    }

    this.onAudioChunk = onAudioChunk;

    this.process.stdin.write(text + '\n');
    this.process.stdin.end();


    this.process.stdout.on('end', () => {
      onEnd();
    });

  }

  async start() {
    if (this.isRunning) return
    const binaryPath = this.getBinaryPath()
    const execName = process.platform === 'win32' ? 'piper.exe' : 'piper'
    const fullPath = path.resolve(binaryPath, execName);
    const fullModelPath = path.resolve(binaryPath, this.modelToUse);

    console.log(`${fullPath} --model ${fullModelPath} --output_raw -`);

    this.process = spawn(fullPath, [
      '--model', fullModelPath,
      '--output_raw', '-'
    ]);
    logInfo(`Piper is running...`)

    this.process.stdout.on('data', (chunk: Buffer) => {
      if (Buffer.isBuffer(chunk)) {
        console.log("streaming audio")
        this.onAudioChunk(chunk);
        mainWindow?.webContents.send("stream-audio-chunk", chunk);
      } else {
        logError(`Piper error 1`);
      }
    });

    this.process.stderr.on('data', (err: Buffer | any) => {
      if (Buffer.isBuffer(err)) {
        console.log("streaming audio")
        this.onAudioChunk(err);
        mainWindow?.webContents.send("stream-audio-chunk", err);
      } else {
      logError(`Piper error 2`);
      }
    });

    this.isRunning = true
    return true
  }

  async stop() {
    if (!this.isRunning) return
    this.process.kill()
    this.isRunning = false
  }
}
