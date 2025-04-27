import { mainWindow } from "main/windows/main";
import { IPC } from "shared/constants";

export type LogArgs = {
  error?: Error | any;
  showUI?: boolean;
  throwError?: boolean;
  category?: "ChromaDB" | "Ollama" | "GPU" | "General";
};

type LogLevel = 'error' | 'info' | 'warn';

const logMessage = (
  level: LogLevel,
  message: string,
  { error, showUI, category = 'General', throwError }: LogArgs = {}
) => {
  const logPrefix = category ? `[${category}] ${message}` : message;
  const consoleMethod = console[level] || console.log;

  consoleMethod(logPrefix);

  if (error) {
    consoleMethod(JSON.stringify(error, Object.getOwnPropertyNames(error)));
    if (throwError) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  if (showUI && mainWindow?.webContents) {
    let ipcChannel: string | undefined;
    switch (level) {
      case 'error':
        ipcChannel = IPC.ERRORS.SHOW_UI_ERROR;
        break;
      case 'info':
        ipcChannel = IPC.ERRORS.SHOW_UI_INFO;
        break;
      case 'warn':
        ipcChannel = IPC.ERRORS.SHOW_UI_WARN;
        break;
    }
    if (ipcChannel) {
      mainWindow.webContents.send(ipcChannel, message);
    }
  }
};

export const logError = (message: string, args: LogArgs = {}) => {
  logMessage('error', message, args);
};

export const logInfo = (message: string, args: LogArgs = {}) => {
  logMessage('info', message, args);
};

export const logWarning = (message: string, args: LogArgs = {}) => {
  logMessage('warn', message, args);
};
