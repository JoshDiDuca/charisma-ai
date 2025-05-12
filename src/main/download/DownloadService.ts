import { EventEmitter } from 'events'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import https from 'https'
import { app } from 'electron'
import extract from 'extract-zip';
import { get } from 'lodash'
import { GitHubService } from './GithubService'

export interface DownloadProgress {
  percentage: number
  transferred: number
  total: number
  version: string
}
export class DownloadService extends EventEmitter {
  private currentDownload: AbortController | null = null
  private tempExtension = '.downloading'
  private githubService = new GitHubService()

  async getLatestVersionInfo(
    repo: string,
    currentVersion: string,
    checkForV: boolean = false
  ) {
    const release = await this.githubService.getReleaseInfo(repo, checkForV)
    return {
      currentVersion,
      latestVersion: release.tag_name,
      hasUpdate: this.isNewerVersion(release.tag_name, currentVersion),
      releaseNotes: release.body,
      publishedAt: release.published_at
    }
  }

  async checkForUpdate(
    repo: string,
    currentVersion: string,
    checkForV: boolean = false
  ) {
    const { latestVersion, hasUpdate } = await this.getLatestVersionInfo(repo, currentVersion, checkForV)
    console.log(currentVersion, latestVersion, hasUpdate)
    return hasUpdate ? latestVersion : undefined
  }


  async downloadLatest(
    repo: string,
    targetDir: string,
    versionFilter?: string,
    moveOnlyFolder?: boolean
  ): Promise<string> {
    const release = await this.githubService.getReleaseInfo(repo)
    const filter = versionFilter || this.getPlatformIdentifier()

    // Get all matching assets and sort by name length
    const matchingAssets = release.assets
      .filter(a => a.name.includes(filter))
      .sort((a, b) => a.name.length - b.name.length)

    if (!matchingAssets.length) throw new Error('No compatible asset found')

    const asset = matchingAssets[0]

    return this.downloadReleaseFile(
      asset.browser_download_url,
      targetDir,
      asset.size,
      release.tag_name,
      moveOnlyFolder
    )
  }



  async downloadReleaseFile(
    url: string,
    targetDir: string,
    expectedSize: number = 0,
    version: string = '',
    moveOnlyFolder: boolean = false
  ): Promise<string> {
    const controller = new AbortController()
    this.currentDownload = controller

    const tempFile = path.join(targetDir, path.basename(url) + this.tempExtension)
    const finalFile = tempFile.replace(this.tempExtension, '')

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ElectronDownloadService' }
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (!response.body) throw new Error('No response body')

      const writer = fs.createWriteStream(tempFile)
      const reader = response.body.getReader()
      let transferred = 0
      const total = expectedSize || parseInt(response.headers.get('Content-Length') || '0', 10)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        writer.write(Buffer.from(value))
        transferred += value.length

        this.emit('progress', {
          percentage: total ? Math.round((transferred / total) * 100) : -1,
          transferred,
          total,
          version
        } as DownloadProgress)
      }

      writer.end()
      await fsPromises.rename(tempFile, finalFile)

      if (total && transferred !== total) {
        throw new Error('Size mismatch - possible corrupted download')
      }

      // Extract the downloaded zip
      await extract(finalFile, {
        dir: targetDir,
        onEntry: (entry, zipfile) => {
          this.emit('extract-progress', {
            entry,
            fileCount: zipfile.entryCount
          })
        }
      })

      if (total && transferred !== total) {
        throw new Error('Size mismatch - possible corrupted download')
      }


      if (moveOnlyFolder) {
        const extractedContents = await fs.promises.readdir(targetDir);
        for (const content of extractedContents) {
          const sourcePath = path.join(targetDir, content);
          await this.moveContents(sourcePath, targetDir);
        }
      }

      return finalFile
    } finally {
      this.cleanupTemp(tempFile)
    }

  }

  async downloadFile(url: string, destPath: string): Promise<void> {
  // Create the directory structure first
  const destDir = path.dirname(destPath);
  await fs.promises.mkdir(destDir, { recursive: true });

  const tempPath = `${destPath}${this.tempExtension}`;
  const controller = new AbortController();
  this.currentDownload = controller;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ElectronDownloadService' }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const writer = fs.createWriteStream(tempPath);
    const reader = response.body!.getReader();
    const total = parseInt(response.headers.get('Content-Length') || '0', 10);
    let transferred = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writer.write(Buffer.from(value));
      transferred += value.length;

      this.emit('progress', {
        percentage: total ? Math.round((transferred / total) * 100) : -1,
        transferred,
        total,
        version: ''
      } as DownloadProgress);
    }

    await new Promise<void>((resolve, reject) => {
      writer.end();
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Ensure the destination directory exists again (in case it was deleted during download)
    await fs.promises.mkdir(destDir, { recursive: true });

    // Rename the temp file to the final destination
    try {
      fs.renameSync(tempPath, destPath);
    } catch (error) {
      // If rename fails (can happen across different drives), try copy and delete
      await fs.promises.copyFile(tempPath, destPath);
      await fs.promises.unlink(tempPath);
    }

    if (total && transferred !== total) {
      throw new Error('Size mismatch - possible corrupted download');
    }
  } catch (error) {
    // Clean up temp file if it exists
    this.cleanupTemp(tempPath);
    throw error;
  } finally {
    this.currentDownload = null;
  }
}


  private getPlatformIdentifier(): string {
    const platformMap = {
      win32: 'windows',
      darwin: 'darwin',
      linux: 'linux'
    }
    return get(platformMap, process.platform as string) || 'unknown'
  }

  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const semverToNum = (v: string) =>
      v.split('.').reduce((acc, val) => acc * 1000 + parseInt(val), 0)
    return semverToNum(newVersion.replace("v", "").trim()) > semverToNum(currentVersion.replace("v", "").trim())
  }

  private cleanupTemp(tempPath: string, finalFile?: string): void {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
  }

  private async moveContents(source: string, target: string) {
    // Add existence check
    if (!fs.existsSync(source)) {
      throw new Error(`Source directory ${source} does not exist`);
    }

    const entries = await fs.promises.readdir(source, { withFileTypes: true });

    // Ensure target directory exists
    await fs.promises.mkdir(target, { recursive: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(target, entry.name);

      if (entry.isDirectory()) {
        await this.moveContents(srcPath, destPath);
      } else {
        // Use copy + delete instead of rename for cross-device support
        await fs.promises.copyFile(srcPath, destPath);
        await fs.promises.unlink(srcPath);
      }
    }
    await fs.promises.rmdir(source)
  };

  abort(): void {
    this.currentDownload?.abort()
    this.currentDownload = null
  }
}
