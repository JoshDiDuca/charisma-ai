import ReactDom from 'react-dom/client'
import React from 'react'

import { WindowStoreProvider } from './store'
import { AppRoutes } from './routes'
import { HeroUIProvider, ToastProvider } from '@heroui/react'

import 'resources/styles/globals.sass'
import './output.css'

ReactDom.createRoot(document.querySelector('app') as HTMLElement).render(
  <React.StrictMode>
    <WindowStoreProvider>
      <HeroUIProvider>
        <ToastProvider />
        <AppRoutes />
      </HeroUIProvider>
    </WindowStoreProvider>
  </React.StrictMode>
)
