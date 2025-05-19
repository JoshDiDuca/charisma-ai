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
  SETTINGS: {
    GET_SETTINGS: "settings:get-settings",
    SAVE_SETTINGS: "settings:save-settings"
  },
  SOURCE: {
    SELECT_FOLDER: "source:select-folder",
    ADD_SOURCES: "source:add-sources",
    QUERY: "source::query",
  },
  CORE: {
    GET_APP_STATUS: 'get-app-status',
    UPDATE_SPLASH: 'update-splash'
  },
  LLM: {
    GET_STATUS: 'llm:get-status',
    GET_ALL_MODELS: 'llm:get-all-models',
    GET_INSTALLED_MODELS: 'llm:get-installed-models',
    GET_INSTALLED_EMBEDDING_MODELS: 'llm:get-installed-embedding-models',
    GET_ALL_EMBEDDING_MODELS: 'llm:get-all-embedding-models',
    UPDATE_ALL_EMBEDDING_MODELS: "llm:update-all-embedding-models",
    UPDATE_ALL_MODELS: 'llm:update-all-models',
    DOWNLOAD_MODEL_PROGRESS: 'llm:download-model-progress',
    DOWNLOAD_MODEL: 'llm:download-model',
    SEND_MESSAGE: 'llm:send-message',
    STREAM_UPDATE: 'llm:stream-update',
    GET_MODEL_INFO: 'llm:get-model-info'
  },
  VOICE: {
    STREAM_AUDIO_START: "stream-audio-chunk-starting",
    STREAM_AUDIO_CHUCK: "stream-audio-chunk",
    STREAM_AUDIO_ERROR: "stream-audio-error",
    STREAM_AUDIO_END: "stream-audio-chunk-end",
    TRANSCRIBE_AUDIO: 'voice:transcribe-audio',
    START_RECORDING: 'voice:start-recording',
    STOP_RECORDING: 'voice:stop-recording',
    TEXT_TO_SPEECH: 'voice:text-to-speech',
    TOGGLE_TEXT_TO_SPEECH: 'voice:toggle-text-to-speech',
    TEXT_TO_SPEECH_STATUS: 'voice:text-to-speech-status'
  },
  CONVERSATION: {
    GET_ALL: 'conversation:get-all',
    GET: 'conversation:get',
    CREATE: 'conversation:create',
    DELETE: 'conversation:delete',
    UPDATE_TITLE: 'conversation:update-title',
    ADD_MESSAGE: 'conversation:add-message',
    GENERATE_TITLE: 'conversation:generate-title'
  }
}
