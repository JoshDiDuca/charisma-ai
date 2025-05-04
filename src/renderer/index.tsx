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

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  <React.StrictMode>
    <WindowStoreProvider>
      <HeroUIProvider>
        <ChatBotProvider>
          <AudioPlayerProvider>
            <ToastProvider />
            <AppRoutes />
          </AudioPlayerProvider>
        </ChatBotProvider>
      </HeroUIProvider>
    </WindowStoreProvider>
  </React.StrictMode>
)
