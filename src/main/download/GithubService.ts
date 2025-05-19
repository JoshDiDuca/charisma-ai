import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { getPath } from 'main/services/files/fileService.directory';

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
  private readonly cacheExpiry = 4 * 60 * 60 * 1000; // 4 hours

  constructor() {
  }

  async getReleaseInfo(repo: string): Promise<GitHubRelease[]> {
    const cacheKey = `${repo}`;
    const cachePath = getPath("GithubCache", `${cacheKey}.json`);

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
        return this.processReleases(cache.data);
      }

      // Handle API errors
      if (!response.ok) {
        if (cache) return this.processReleases(cache.data);
        throw new Error(`GitHub API failed: ${response.status} ${response.statusText}`);
      }

      // Process and cache new data
      const releases: GitHubRelease[] = await response.json();
      await this.updateCache(cachePath, releases, response.headers.get('ETag'));
      return this.processReleases(releases);
    } catch (error) {
      // Fallback to cache on network errors
      if (cache) return this.processReleases(cache.data);
      throw error;
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

    try {
      await fs.promises.writeFile(cachePath, JSON.stringify(newCache));
    } catch (error) {
      console.error('Failed to write cache:', error);
    }
  }

  private processReleases(releases: GitHubRelease[]): GitHubRelease[] {
    const filteredReleases = releases;

    filteredReleases.sort((a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    if (!filteredReleases.length) {
      throw new Error(`No releases found`);
    }

    return filteredReleases;
  }
}
