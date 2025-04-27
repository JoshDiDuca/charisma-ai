import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { Container, Heading, Button } from 'renderer/components'
import { useWindowStore } from 'renderer/store'
import { ChatInterface } from '../Chat/ChatInterface'
import { Sidebar } from 'renderer/components/Sidebar/Sidebar'

// The "App" comes from the context bridge in preload/index.ts
const { App } = window

export function MainScreen() {
  const navigate = useNavigate()
  const store = useWindowStore().about;

  const [model, setModel] = useState<string>('llama3:latest');
  const [embeddingModel, setEmbeddingModel] = useState<string>('mxbai-embed-large:latest');

  useEffect(() => {
    App.sayHelloFromBridge()

    App.whenAboutWindowClose(({ message }) => {
      console.log(message)

      store.setAboutWindowState(false)
    })
  }, [])

  function openAboutWindow() {
    App.createAboutWindow()
    store.setAboutWindowState(true)
  }

  return (
    <Container>
      <div className="inline-flex" style={{ width: '100%' }}>
        <Sidebar model={model} embeddingModel={embeddingModel} setModel={setModel} setEmbeddingModel={setEmbeddingModel} />
        <ChatInterface model={model} embeddingModel={embeddingModel} setModel={setModel} setEmbeddingModel={setEmbeddingModel} />
      </div>
    </Container>
  )
}
