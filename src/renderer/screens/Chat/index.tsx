import { useNavigate } from 'react-router-dom'

import { Container, Heading, Button } from 'renderer/components'
import { ChatInterface } from './ChatInterface'

export function Chat() {
  const navigate = useNavigate()

  return (
    <Container>
      <ChatInterface />

      <Button onClick={() => navigate('/')}>Go back to Main screen</Button>
    </Container>
  )
}
