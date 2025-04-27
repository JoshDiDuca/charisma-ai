import { app, BrowserWindow } from 'electron'

import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from 'electron-extension-installer'

import { ignoreConsoleWarnings } from '../../utils/ignore-console-warnings'
import { PLATFORM, ENVIRONMENT } from 'shared/constants'
import { makeAppId } from 'shared/utils'
import { ChromaInstanceService } from 'main/services/chroma/chromaInstanceService'
import { OllamaInstanceService } from 'main/services/ollama/ollamaInstanceService'
import { logError, logWarning } from 'main/services/log/logService'

ignoreConsoleWarnings(['Manifest version 2 is deprecated'])

export async function makeAppSetup(createWindow: () => Promise<BrowserWindow>) {
  if (ENVIRONMENT.IS_DEV) {
    await installExtension([REACT_DEVELOPER_TOOLS], {
      loadExtensionOptions: {
        allowFileAccess: true,
      },
    })
  }

  let window = await createWindow()


  const chromaService = new ChromaInstanceService()
  const ollamaService = new OllamaInstanceService()
  await ollamaService.start()
  await chromaService.start()

  app.on('will-quit', async (e) => {
    e.preventDefault()
    await chromaService.stop()
    await ollamaService.stop()
    app.exit()
  })

  // Catch process-level errors
  process.on('uncaughtException', error => {
    logError('Uncaught Exception:', { error });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled Rejection at:', { error: { promise, reason } });
  });

  // Add memory monitoring
  setInterval(() => {
    const usedMB = process.memoryUsage().heapUsed / 1024 / 1024;
    if (usedMB > 3500) {
      logWarning(`High memory usage: ${usedMB.toFixed(2)}MB`);
    }
  }, 5000);

  app.on('activate', async () => {
    const windows = BrowserWindow.getAllWindows()

    if (!windows.length) {
      window = await createWindow()
    } else {
      for (window of windows.reverse()) {
        window.restore()
      }
    }
  })

  app.on('web-contents-created', (_, contents) =>
    contents.on(
      'will-navigate',
      (event, _) => !ENVIRONMENT.IS_DEV && event.preventDefault()
    )
  )

  app.on('window-all-closed', () => !PLATFORM.IS_MAC && app.quit())

  return window
}

PLATFORM.IS_LINUX && app.disableHardwareAcceleration()

PLATFORM.IS_WINDOWS &&
  app.setAppUserModelId(ENVIRONMENT.IS_DEV ? process.execPath : makeAppId())

app.commandLine.appendSwitch('force-color-profile', 'srgb')
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

// Add periodic GC (optional)
setInterval(() => {
  if (process.memoryUsage().heapUsed > 2 * 1024 * 1024 * 1024) { // 2GB
    global?.gc && global.gc();
  }
}, 10000).unref();
