import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { Container } from 'renderer/components'
import { useWindowStore } from 'renderer/store/windowStore'
import { ChatInterface } from '../Chat/ChatInterface'
import { Sidebar } from 'renderer/components/Sidebar/Sidebar'
import { IPC } from 'shared/constants'
import { addToast } from '@heroui/react'
import { Conversation } from 'shared/types/Conversation'

// The "App" comes from the context bridge in preload/index.ts
const { App } = window

export function MainScreen() {
  const navigate = useNavigate()
  const store = useWindowStore().about;

  useEffect(() => {
    App.checkBridge()
  }, [])

  App.on(IPC.ERRORS.SHOW_UI_ERROR, (message: string) => {
    addToast({
      title: message,
      color: "danger",
    })
  })

  App.on(IPC.ERRORS.SHOW_UI_INFO, (message: string) => {
    addToast({
      title: message,
      color: "default",
    })
  })

  App.on(IPC.ERRORS.SHOW_UI_WARN, (message: string) => {
    addToast({
      title: message,
      color: "warning",
    })
  })

  return (
    <Container>
      <div className="inline-flex" style={{ width: '100%' }}>
        <Sidebar  />
        <ChatInterface />
      </div>
    </Container>
  )
}
