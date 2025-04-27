export const IPC = {
  WINDOWS: {
    ABOUT: {
      CREATE_WINDOW: 'windows: create-about-window',
      WHEN_WINDOW_CLOSE: 'windows: when-about-window-close',
    },
  },
  ERRORS: {
    SHOW_UI_ERROR: 'ui:error',
    SHOW_UI_INFO: 'ui:info',
    SHOW_UI_WARN: 'ui:warn'
  },
  LLM : {
    UPDATE_ALL_MODELS: 'update-all-models',
    UPDATE_ALL_EMBEDDING_MODELS: 'update-all-embedding-models',
    STREAM_UPDATE: 'stream-update',
  }
}
