import { spawn, exec, ChildProcess } from 'child_process'; // Import exec and ChildProcess type
import { app } from 'electron';
import path from 'path';
// Removed rootPath import as it wasn't used, restore if needed elsewhere
import util from 'util'; // Import util for promisify

const execPromise = util.promisify(exec);

// --- GPU Detection Logic ---
interface GpuInfo {
  uuid: string;
  computeCapability: number;
  // memoryTotalMB: number; // Keep if needed for future checks
}

export async function getEligibleGpu(): Promise<GpuInfo | null> {
  // Only check on Windows and Linux where nvidia-smi is common
  if (process.platform !== 'win32' && process.platform !== 'linux') {
      console.log('GPU check skipped: Not on Windows or Linux.');
      return null;
  }

  try {
    const command = 'nvidia-smi --query-gpu=uuid,compute_cap --format=csv,noheader';
    const { stdout, stderr } = await execPromise(command);

    if (stderr && !stdout) { // Only treat stderr as fatal if stdout is empty
      console.warn('nvidia-smi stderr (and no stdout):', stderr);
      return null;
    }
    if (!stdout) {
      console.log('nvidia-smi command ran but produced no output.');
      return null;
    }

    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const [uuid, computeCapStr] = line.split(',').map(s => s.trim());
      const computeCapability = parseFloat(computeCapStr);

      console.log(`Detected GPU: UUID=${uuid}, CC=${computeCapability}`);

      if (!isNaN(computeCapability) && computeCapability >= 5.0) { // Ollama requires CC 5.0+
        console.log(`Found eligible GPU: UUID=${uuid}, CC=${computeCapability}`);
        return { uuid, computeCapability };
      }
    }

    console.log('No GPU with Compute Capability >= 5.0 found.');
    return null;

  } catch (error: any) {
    if (error.code === 'ENOENT' || (error.message && error.message.includes('is not recognized'))) {
        console.log('nvidia-smi command not found. Assuming no eligible Nvidia GPU or drivers not installed.');
    } else {
        console.error('Error executing nvidia-smi:', error.message);
    }
    return null;
  }
}
