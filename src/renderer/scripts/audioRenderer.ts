import PCMPlayer from "pcm-player";

let audioContext = new AudioContext({ sampleRate: 22050 }); // Match Piper's sample rate
let bufferQueue: Float32Array[] = [];
let playing = false;
let recordedChunks: Int16Array[] = [];


// Initialize with Piper TTS specs (adjust to your model's settings)
const player = new PCMPlayer({
  inputCodec: 'Int16',  // Matches Piper's 16-bit PCM
  channels: 1,          // Mono
  sampleRate: 22050,    // Must match your model's output
  flushTime: 100,     // Lower latency for real-time
  fftSize : 1024
});
// Handle incoming audio chunks
window.App.on('stream-audio-chunk', (pcmBuffer: ArrayBuffer) => {
  player.feed(pcmBuffer);
});

// // Volume control (optional)
// document.getElementById('volume').addEventListener('input', (e) => {
//   player.volume = parseFloat((e.target as HTMLInputElement).value);
// });

// Example: attach to a button
// document.getElementById('downloadBtn')!.onclick = downloadAudio;
