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
  LLM: {
    GET_STATUS: 'llm:get-status',
    GET_ALL_MODELS: 'llm:get-all-models',
    UPDATE_ALL_MODELS: 'llm:update-all-models',
    DOWNLOAD_MODEL: 'llm:download-model',
    SEND_MESSAGE: 'llm:send-message',
    STREAM_UPDATE: 'llm:stream-update',
    GET_MODEL_INFO: 'llm:get-model-info'
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
