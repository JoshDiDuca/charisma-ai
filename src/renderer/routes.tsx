import { Route } from 'react-router-dom'
import { Router } from 'lib/electron-router-dom'
import { MainScreen, SplashScreen } from 'renderer/screens'
import { useSettings } from './store/settingsProvider'

export function AppRoutes() {
  const { settings} = useSettings();
  return (
    <main className={`${settings?.darkMode ? "dark" : "light"} text-foreground bg-background`}>
      <Router
        splash={<Route path="/" element={<SplashScreen />} />}
        main={<Route path="/" element={<MainScreen />}
        />} />
    </main>)
}
