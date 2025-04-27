import { exec } from 'child_process'; // Import exec and ChildProcess type
import util from 'util'; // Import util for promisify
import { logError, logInfo, logWarning } from './log/logService';

const execPromise = util.promisify(exec);

interface GpuInfo {
  uuid: string;
  computeCapability: number;
}

export async function getEligibleGpu(): Promise<GpuInfo | null> {
  // Only check on Windows and Linux where nvidia-smi is common
  if (process.platform !== 'win32' && process.platform !== 'linux') {
      logInfo('GPU check skipped: Not on Windows or Linux.');
      return null;
  }

  try {
    const command = 'nvidia-smi --query-gpu=uuid,compute_cap --format=csv,noheader';
    const { stdout, stderr } = await execPromise(command);

    if (stderr && !stdout) { // Only treat stderr as fatal if stdout is empty
      logWarning('nvidia-smi stderr (and no stdout): ' + stderr);
      return null;
    }
    if (!stdout) {
      logWarning('nvidia-smi command ran but produced no output.');
      return null;
    }

    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const [uuid, computeCapStr] = line.split(',').map(s => s.trim());
      const computeCapability = parseFloat(computeCapStr);

      logInfo(`Detected GPU: UUID=${uuid}, CC=${computeCapability}`);

      if (!isNaN(computeCapability) && computeCapability >= 5.0) { // Ollama requires CC 5.0+
        logInfo(`Found eligible GPU: UUID=${uuid}, CC=${computeCapability}`);
        return { uuid, computeCapability };
      }
    }

    logInfo('No GPU with Compute Capability >= 5.0 found.');
    return null;

  } catch (error: any) {
    if (error.code === 'ENOENT' || (error.message && error.message.includes('is not recognized'))) {
      logInfo('nvidia-smi command not found. Assuming no eligible Nvidia GPU or drivers not installed.');
    } else {
        logError('Error executing nvidia-smi:' + error.message);
    }
    return null;
  }
}
