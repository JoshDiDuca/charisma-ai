import { exec } from 'child_process';
import { logError, logInfo } from '../log/logService';

export const killPreExistingProcesses = async (processName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    let command = '';

    switch (platform) {
      case 'win32':
        command = `taskkill /F /IM ${processName}`;
        break;
      case 'darwin': // macOS
        command = `pkill -f "${processName}"`;
        break;
      case 'linux':
        command = `pkill -f "${processName}"`;
        break;
      default:
        reject(new Error(`Unsupported platform: ${platform}`));
        return;
    }

    exec(command, (error, stdout, stderr) => {
      // Process not found errors are expected and can be ignored
      if (error && !error.message.includes('no process found') &&
          !error.message.includes('no matching processes')) {
        logError(`Failed to kill process ${processName}: ${error.message}`);
        // Don't reject as this is not a critical error
      }

      logInfo(`Attempted to kill any existing ${processName} processes`);
      resolve();
    });
  });
}
