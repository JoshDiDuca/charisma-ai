// services/chromadb.ts
import { spawn } from 'child_process'
import { app } from 'electron'
import path from 'path'
import { rootPath } from 'electron-root-path'

export default function getPlatform() {
  switch (process.platform) {
    case 'aix':
    case 'freebsd':
    case 'linux':
    case 'openbsd':
    case 'android':
      return 'linux'
    case 'darwin':
    case 'sunos':
      return 'mac'
    case 'win32':
      return 'win'
    default:
      return 'unknown'
  }
}

export class ChromaInstanceService {
  private process: any
  private isRunning: boolean = false
  private port: number = 8000

  getBinaryPath() {
    // For packaged app
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'bin', 'chromadb')
    }
    // For development
    else {
      return path.join(rootPath, 'resources', getPlatform(), 'bin', 'chromadb')
    }
  }

  async start() {
    if (this.isRunning) return

    const binaryPath = this.getBinaryPath()
    const execName = process.platform === 'win32' ? 'chroma.exe' : 'chroma'
    const fullPath = path.join(binaryPath, execName)

    // Run chroma as a server
    this.process = spawn(fullPath, [
      'run',
      '--path',
      path.join(binaryPath, 'db'),
    ])

    return new Promise((resolve, reject) => {
      this.process.stdout.on('data', (data: any) => {
        console.log(`ChromaDB: ${data}`)
        if (data.toString().includes('Server started')) {
          this.isRunning = true
          resolve(true)
        }
      })

      this.process.stderr.on('data', (data: any) => {
        console.error(`ChromaDB error: ${data}`)
        reject(new Error(data.toString()))
      })

      this.process.on('close', (code: any) => {
        this.isRunning = false
        console.log(`ChromaDB process exited with code ${code}`)
      })
    })
  }

  async stop() {
    if (!this.isRunning) return
    this.process.kill()
    this.isRunning = false
  }

  getClientConfig() {
    return {
      path: `http://localhost:${this.port}`,
    }
  }
}
