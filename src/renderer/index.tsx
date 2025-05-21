import ReactDom from 'react-dom/client'
import React from 'react'

import { WindowStoreProvider } from './store/windowStore'
import { AppRoutes } from './routes'
import { HeroUIProvider, ToastProvider } from '@heroui/react'
import { AudioPlayerProvider } from './store/audioPlayerProvider'
import { ChatBotProvider } from './store/conversationProvider'

import 'resources/styles/globals.sass'
import './output.css'

import "./store/audioPlayerProvider"
import { SettingsProvider } from './store/settingsProvider'

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  <React.StrictMode>
    <WindowStoreProvider>
      <HeroUIProvider>
        <ChatBotProvider>
          <SettingsProvider>
            <AudioPlayerProvider>
              <ToastProvider />
              <AppRoutes />
            </AudioPlayerProvider>
          </SettingsProvider>
        </ChatBotProvider>
      </HeroUIProvider>
    </WindowStoreProvider>
  </React.StrictMode>
)
