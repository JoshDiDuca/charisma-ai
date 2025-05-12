import fs from 'fs';
import path from 'path';
import { app } from 'electron';

interface GitHubAsset {
  browser_download_url: string;
  name: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  body: string;
  published_at: string;
  assets: GitHubAsset[];
}

interface GitHubCache {
  etag?: string;
  data: GitHubRelease[];
  expires: number;
}

export class GitHubService {
  private readonly cacheDir: string;
  private readonly cacheExpiry = 4 * 60 * 60 * 1000; // 4 hours

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'github_cache');
    // Ensure the cache directory exists
    this.ensureDirExists(this.cacheDir);
  }

  async getReleaseInfo(repo: string, checkForV = false): Promise<GitHubRelease> {
    const cacheKey = `${repo}-${checkForV}`;
    const cachePath = path.join(this.cacheDir, `${cacheKey}.json`);

    const cache = await this.readCache(cachePath);
    const headers: Record<string, string> = {
      'User-Agent': 'ElectronDownloadService'
    };

    if (cache?.etag) {
      headers['If-None-Match'] = cache.etag;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/releases`, { headers });

      // Return cached data if not modified
      if (response.status === 304 && cache) {
        return this.processReleases(cache.data, checkForV);
      }

      // Handle API errors
      if (!response.ok) {
        if (cache) return this.processReleases(cache.data, checkForV);
        throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`);
      }

      // Process and cache new data
      const releases: GitHubRelease[] = await response.json();
      await this.updateCache(cachePath, releases, response.headers.get('ETag'));
      return this.processReleases(releases, checkForV);
    } catch (error) {
      // Fallback to cache on network errors
      if (cache) return this.processReleases(cache.data, checkForV);
      throw error;
    }
  }

  private ensureDirExists(dirPath: string): void {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory: ${dirPath}`, error);
    }
  }

  private async readCache(cachePath: string): Promise<GitHubCache | null> {
    try {
      const fileContent = await fs.promises.readFile(cachePath, 'utf-8');
      const cache: GitHubCache = JSON.parse(fileContent);

      return cache.expires > Date.now() ? cache : null;
    } catch {
      return null;
    }
  }

  private async updateCache(cachePath: string, releases: GitHubRelease[], etag?: string | null): Promise<void> {
    const newCache: GitHubCache = {
      etag: etag || undefined,
      data: releases,
      expires: Date.now() + this.cacheExpiry
    };

    // Ensure the directory exists before writing
    this.ensureDirExists(path.dirname(cachePath));

    try {
      await fs.promises.writeFile(cachePath, JSON.stringify(newCache));
    } catch (error) {
      console.error('Failed to write cache:', error);
    }
  }

  private processReleases(releases: GitHubRelease[], checkForV: boolean): GitHubRelease {
    const filteredReleases = checkForV
      ? releases.filter(release => release.tag_name.startsWith('v'))
      : releases;

    filteredReleases.sort((a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    if (!filteredReleases.length) {
      throw new Error(`No releases found${checkForV ? ' with v-prefix' : ''}`);
    }

    return filteredReleases[0];
  }
}
