import { Router, Route } from 'electron-router-dom'

import { MainScreen, AboutScreen, AnotherScreen } from 'renderer/screens'
import { Chat } from './screens/Chat'

export function AppRoutes() {
  return (
    <Router
      main={
        <>
          <Route path="/" element={<MainScreen />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/anotherScreen" element={<AnotherScreen />} />
        </>
      }
      about={<Route path="/" element={<AboutScreen />} />}
    />
  )
}
