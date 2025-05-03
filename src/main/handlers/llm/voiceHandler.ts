import { spawn } from 'child_process';
import { nodewhisper } from 'nodejs-whisper'
import ollama from 'ollama';
import fs from 'fs/promises';
import path from 'path';
import { shell } from 'electron';
import { getEligibleGpu } from 'main/services/gpuService';
import { logError, logInfo } from 'main/services/log/logService';
import { ttsService } from 'lib/electron-app/factories/app/setup';
import { IpcHandle } from '../IpcHandle';
import { IPC } from 'shared/constants';

async function convertWebmToWav(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-acodec', 'pcm_s16le',
      '-ac', '1',
      '-ar', '16000',
      outputPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg conversion failed with code ${code}`));
    });

    ffmpeg.stderr.on('data', (data) => logInfo(data.toString()));
  });
}

export class VoiceHandlers {
  async transcribeAudio(audioData: string) {
    const tempDir = path.join(process.cwd(), 'temp_audio');
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Write WebM file
      const webmPath = path.join(tempDir, `audio_${Date.now()}.webm`);
      await fs.writeFile(webmPath, Buffer.from(audioData, 'base64'));

      // Convert to WAV
      const wavPath = path.join(tempDir, `audio_${Date.now()}.wav`);
      await convertWebmToWav(webmPath, wavPath);

      // Whisper transcription
      const transcript = await nodewhisper(wavPath, {
        modelName: 'base',
        autoDownloadModelName: 'base',
        withCuda: !!(await getEligibleGpu())
      });

      // Ollama processing
      const processed = await ollama.generate({
        model: 'llama3.1',
        prompt: transcript,
        stream: false
      });

      return {
        raw: transcript,
        processed: processed.response
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  @IpcHandle(IPC.VOICE.TRANSCRIBE_AUDIO)
  async handleTranscribeAudio(audioData: string) {
    try {
      const result = await this.transcribeAudio(audioData);
      return { success: true, ...result };
    } catch (error) {
      logError('Transcription failed.', { error, showUI: true });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  @IpcHandle(IPC.VOICE.START_RECORDING)
  async startRecording() {
    return { success: true };
  }

  @IpcHandle(IPC.VOICE.STOP_RECORDING)
  async stopRecording() {
    return { success: true };
  }

  @IpcHandle(IPC.VOICE.TEXT_TO_SPEECH)
  async textToSpeech(text: string) {
    return ttsService.stream(
      text
    );
  }

  @IpcHandle(IPC.VOICE.TOGGLE_TEXT_TO_SPEECH)
  async toggleTextToSpeech(boolean?: boolean) {
    return true;
  }

  @IpcHandle(IPC.VOICE.TEXT_TO_SPEECH_STATUS)
  async getTextToSpeechStatus() {
    return true;
  }
}
