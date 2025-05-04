import { TreeNode } from "main/services/files/fileService";

type RequireKey<T, K extends keyof T> = Required<Pick<T, K>> & Partial<Omit<T, K>>;

export type WebSource = {
  title: string;
  url: string;
  description?: string;
  icon?: string;
};

export type FileSource = {
  filePath: string;
  fileName: string;
  fileNameWithoutExtension: string;
  fileType: string;
  fileSize: number;
  lastModified?: Date;
};

export type DirectorySource = {
  directoryPath: string;
  directoryName: string;
  fileTree?: TreeNode
  directorySize?: number;
  lastModified?: Date;
};

export type Source =
  | ({ type: "Directory" } & DirectorySource)
  | ({ type: "File" } & FileSource)
  | ({ type: "Web" } & WebSource);

export type SourceInput =
  | ({ type: "Directory" } & DirectorySourceInput)
  | ({ type: "File" } & FileSourceInput)
  | ({ type: "Web" } & WebSourceInput);

export type DirectorySourceInput = RequireKey<DirectorySource, "directoryPath">;
export type FileSourceInput = RequireKey<FileSource, "filePath">;
export type WebSourceInput = RequireKey<WebSource, "url">;

export type SourceType = Source["type"];
