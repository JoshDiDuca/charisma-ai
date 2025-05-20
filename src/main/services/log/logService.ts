import fs from 'fs';
import path from 'path';
import { mainWindow } from "main/windows/main";
import { IPC } from "shared/constants";
import { Module } from "shared/constants/modules";
import { getPath } from '../files/fileService.directory';

export type LogArgs = {
  error?: Error | any;
  showUI?: boolean;
  category?: keyof typeof Module | "general";
  logToConsole?: boolean;
};

type LogLevel = 'error' | 'info' | 'warn';

// Configure log directory
const LOG_DIR = getPath('Logs');

const formatDate = () => {
  const now = new Date();
  return `${now.toISOString().replace(/T/, ' ').replace(/\..+/, '')}`;
};

const writeToLogFile = (category: string, level: LogLevel, message: string, error?: any) => {
  const logFile = path.join(LOG_DIR, `${category || 'general'}.log`);
  const timestamp = formatDate();
  let logContent = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  if (error) {
    if (error instanceof Error) {
      logContent += `\nError: ${error.message}\nStack: ${error.stack}`;
    } else {
      logContent += `\nError: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
    }
  }

  logContent += '\n';

  fs.appendFileSync(logFile, logContent);
};

const logMessage = (
  level: LogLevel,
  message: string,
  { error, showUI, category = 'general', logToConsole = true }: LogArgs = {}
) => {
  const logPrefix = category ? `[${category}] ${message}` : message;

  // Write to log file
  writeToLogFile(category, level, message, error);

  // Log to console if enabled
  if (logToConsole) {
    const consoleMethod = console[level] || console.log;
    consoleMethod(logPrefix);

    if (error) {
      consoleMethod(error instanceof Error ? error : JSON.stringify(error, Object.getOwnPropertyNames(error)));
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
}
