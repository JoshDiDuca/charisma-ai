// electron/services/chromadb.ts (Example)
import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logError, logInfo } from '../log/logService';
import { getChromaOnlineStatus } from './chromaService';

export class ChromaInstanceService {
    private process: ChildProcess | null = null;
    private isRunning: boolean = false;
    private port: number = 8000; // Match default in chroma_server.py

    getBinaryPath(): string | null {
        const exeName = process.platform === 'win32' ? 'chroma_server.exe' : 'chroma_server';

        const binaryPath = app.isPackaged
            ? path.join(process.resourcesPath, 'bin', 'chroma', exeName) // Adjusted 'to' path
            : path.join(app.getAppPath(), 'python-server', 'dist', exeName);

        if (fs.existsSync(binaryPath)) {
            return binaryPath;
        }
        console.error(`ChromaDB binary not found at: ${binaryPath}`);
        return null;
    }

    // Get a writable path for ChromaDB data
    getDataPath(): string {
      return path.join(app.getPath('userData'), 'chroma_data');
    }


    async start(): Promise<boolean> {
        if (this.isRunning) return true;
        const binaryPath = this.getBinaryPath();
        if (!binaryPath) return false;

        const alreadyExists = await getChromaOnlineStatus();

        if(alreadyExists) {
            this.isRunning = true;
            return true;
        }

        const dataPath = this.getDataPath(); // Get user data path

        console.log(`Starting ChromaDB from: ${binaryPath}`);
        console.log(`ChromaDB data directory: ${dataPath}`);

        // Pass the absolute data path as an argument
        const args = [
            '--host', '127.0.0.1',
            '--port', this.port.toString(),
            '--path', dataPath // Pass the required path argument
        ];

        this.process = spawn(binaryPath, args, { stdio: 'pipe' });

        // ... (add robust readiness check, error handling, stdout/stderr logging) ...
        this.process.stdout?.on('data', (data) => {
             console.log(`ChromaDB: ${data}`);
             // Check for server started message
             if(data.toString().includes(`Starting ChromaDB server on`)){
                 this.isRunning = true;
                 // Consider resolving promise here
             }
        });

        this.process.stderr?.on('data', (data) => logError(`ChromaDB ERROR`,{ error:data }));
        this.process.on('error', (error) => { logError('ChromaDB spawn error:',{  error }); this.isRunning = false; });
        this.process.on('close', (code) => { logInfo(`ChromaDB exited: ${code}`); this.isRunning = false; });

        // Simplified readiness - replace with a proper check
        // Wait for the stdout message or use a timeout/ping
         return new Promise(resolve => {
            const timeout = setTimeout(() => {
                console.warn("ChromaDB readiness check timed out, assuming running.");
                this.isRunning = true; // Assume running after timeout
                resolve(true);
            }, 10000); // 10 second timeout

            this.process?.stdout?.on('data', (data) => {
                if (data.toString().includes(`Starting ChromaDB server on`)) {
                    clearTimeout(timeout);
                    this.isRunning = true;
                    resolve(true);
                }
            });
             this.process?.on('error', () => { // Resolve false on spawn error
                 clearTimeout(timeout);
                 resolve(false);
             });
        });
    }

    async stop(): Promise<void> {
         if (this.process && !this.process.killed) {
             console.log('Stopping ChromaDB...');
             this.process.kill();
         }
        this.isRunning = false;
    }

     getClientConfig() {
        return {
          host: '127.0.0.1',
          port: this.port
        };
      }
}
