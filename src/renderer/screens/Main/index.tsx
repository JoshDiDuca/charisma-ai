import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { Container, Heading, Button } from 'renderer/components'
import { useWindowStore } from 'renderer/store'
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

  const [model, setModel] = useState<string>('llama3:latest');
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [embeddingModel, setEmbeddingModel] = useState<string>('mxbai-embed-large:latest');

  useEffect(() => {
    App.sayHelloFromBridge()

    App.whenAboutWindowClose(({ message }) => {
      console.log(message)

      store.setAboutWindowState(false)
    })
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

  function openAboutWindow() {
    App.createAboutWindow()
    store.setAboutWindowState(true)
  }

  return (
    <Container>
      <div className="inline-flex" style={{ width: '100%' }}>
        <Sidebar onSelectConversation={(conversation) => setConversation(conversation)} model={model} embeddingModel={embeddingModel} setModel={setModel} setEmbeddingModel={setEmbeddingModel} />
        <ChatInterface conversation={conversation} model={model} embeddingModel={embeddingModel} setModel={setModel} setEmbeddingModel={setEmbeddingModel} />
      </div>
    </Container>
  )
}
