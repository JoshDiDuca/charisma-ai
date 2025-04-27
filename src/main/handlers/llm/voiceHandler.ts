import { spawn } from 'child_process';
import { nodewhisper } from 'nodejs-whisper'
import ollama from 'ollama';
import fs from 'fs/promises';
import path from 'path';
import { ipcMain, shell } from 'electron';
import { getEligibleGpu } from 'main/services/gpuService';
import { logError, logInfo } from 'main/services/log/logService';

// FFmpeg conversion utility
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

export async function transcribeAudio(audioData: string) {
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

// Electron IPC handler example
export const registerVoiceHandlers = () => {
  ipcMain.handle('transcribe-audio', async (_, audioData: string) => {
    try {
      const result = await transcribeAudio(audioData);
      return { success: true, ...result };
    } catch (error) {
      logError('Transcription failed.', { error, showUI: true });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Keep existing recording handlers
  ipcMain.handle('start-recording', async () => ({ success: true }))
  ipcMain.handle('stop-recording', async () => ({ success: true }))
};
