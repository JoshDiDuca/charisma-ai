let audioContext = new AudioContext({ sampleRate: 22050 }); // Match Piper's sample rate
let bufferQueue: Float32Array[] = [];
let playing = false;
let recordedChunks: Int16Array[] = [];

function playNextBuffer() {
  if (bufferQueue.length === 0) {
    playing = false;
    return;
  }
  playing = true;
  const float32 = bufferQueue.shift()!;
  const audioBuffer = audioContext.createBuffer(1, float32.length, audioContext.sampleRate);
  audioBuffer.getChannelData(0).set(float32);

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.onended = playNextBuffer;
  source.start();
}

// Listen for audio chunks from main
window.App.on('stream-audio-chunk', (pcmBuffer: ArrayBuffer) => {
  // Save for download
  const int16 = new Int16Array(pcmBuffer);
  recordedChunks.push(int16);

  // Convert 16-bit PCM to Float32
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768;
  }
  bufferQueue.push(float32);
  if (!playing) playNextBuffer();
});


// Example: attach to a button
// document.getElementById('downloadBtn')!.onclick = downloadAudio;
