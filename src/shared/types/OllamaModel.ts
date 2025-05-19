export type OllamaModelType = "LLM" | "Embedding" | "Reasoning";

export type OllamaModel = { name: string, type: OllamaModelType, installed?: boolean, installing?: boolean; progress?: number; }

export interface Layer {
  url: string;
  size: number;
  mediaType: string;
  filename: string;
}

export interface OllamaUrls {
  config: string;
  layers: Layer[];
  configFilename: string;
}

export interface OllamaExtraction extends OllamaUrls {
  modelName: string;
  tag: string;
  manifestUrl: string;
  manifestResponse: any;
  baseUrl: string;
}

export interface OllamaModelDownloadProgress {
  model: string;
  status: 'starting' | 'downloading' | 'complete' | 'error';
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  currentFile?: string;
  error?: string;
}

export interface OllamaLibraryModel {
  name: string;
  url: string;
  description: string;
  size: string;
  pullCount: string;
  tagCount: string;
  lastUpdated: string;
}
