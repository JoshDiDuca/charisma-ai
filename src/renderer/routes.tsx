import { Route } from 'react-router-dom'

import { Router } from 'lib/electron-router-dom'

import { MainScreen, SplashScreen } from 'renderer/screens'

export function AppRoutes() {
  return <Router
    splash={<Route path="/" element={<SplashScreen />} />}
    main={<Route path="/" element={<MainScreen />}
  />} />
}
