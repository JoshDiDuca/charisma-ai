import React, { useEffect, useState } from 'react'
import { Container } from 'renderer/components'
import { IPC } from 'shared/constants'
import logo_gif from '../../public/liquid_metal_logo.gif'

// The "App" comes from the context bridge in preload/index.ts
const { App } = window

export function SplashScreen() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [subText, setSubText] = useState("");

  useEffect(() => {
    App.checkBridge()

    App.on(IPC.CORE.UPDATE_SPLASH, (text) => setSubText(text))

  }, [])



  return (
    <Container>
      <div className='bg-white dark:bg-black text-black dark:text-white flex flex-col items-center justify-center h-screen'>
        <div className='flex items-center justify-center mt-2 relative'>
          {/* Current image */}
          <img
            src={logo_gif}
            className='mt-2'
            height={250}
            width={250}
          />
        </div>
        <div className='flex items-center justify-center mt-2'>
          <div className='text-lg font-semibold'>Loading...</div>
        </div>
        <div className='flex items-center justify-center mt-2'>
          <div className='text-md text-black dark:text-white'>{subText}</div>
        </div>
      </div>
    </Container>
  )
}
