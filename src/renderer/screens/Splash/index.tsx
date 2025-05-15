import React, { useEffect, useState } from 'react'
import { Container } from 'renderer/components'
import { IPC } from 'shared/constants'
import logo1 from "./../../public/logo1.png"
import logo2 from "./../../public/logo2.png"
import logo3 from "./../../public/logo3.png"
import logo4 from "./../../public/logo4.png"
import logo5 from "./../../public/logo5.png"

// The "App" comes from the context bridge in preload/index.ts
const { App } = window

const logoImages = [
  logo1,
  logo2,
  logo3,
  logo4,
  logo5
]

export function SplashScreen() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [nextImageIndex, setNextImageIndex] = useState(1)
  const [currentOpacity, setCurrentOpacity] = useState(1)
  const [textColorProgress, setTextColorProgress] = useState(0)
  const [subText, setSubText] = useState("");

  useEffect(() => {
    App.checkBridge()

    App.on(IPC.CORE.UPDATE_SPLASH, (text) => setSubText(text))
    const interval = setInterval(() => {
      // Update text color progress immediately when starting fade
      if (nextImageIndex === 0) {
        setTextColorProgress(0)
      } else {
        setTextColorProgress(prev => Math.min(prev + 0.25, 1))
      }

      // Start fading out current image and fading in next image
      const fadeAnimation = setInterval(() => {
        setCurrentOpacity(prev => {
          const newOpacity = Math.max(prev - 0.05, 0)
          return newOpacity
        })
      }, 20)

      setTimeout(() => {
        clearInterval(fadeAnimation)
        setCurrentImageIndex(nextImageIndex)
        setNextImageIndex((nextImageIndex + 1) % logoImages.length)
        setCurrentOpacity(1)
      }, 400)

    }, 1000)

    return () => clearInterval(interval)
  }, [nextImageIndex])

  // Calculate RGB values for gradual transition from black to blue (66, 146, 198)
  const r = Math.round(0 * (1 - textColorProgress) + 66 * textColorProgress)
  const g = Math.round(0 * (1 - textColorProgress) + 146 * textColorProgress)
  const b = Math.round(0 * (1 - textColorProgress) + 198 * textColorProgress)
  const textColor = `rgb(${r}, ${g}, ${b})`

  return (
    <Container>
      <div className='flex items-center justify-center mt-2 relative'>
        {/* Current image */}
        <img
          src={logoImages[currentImageIndex]}
          className='mt-2 absolute'
          height={250}
          width={250}
          style={{ opacity: currentOpacity }}
        />
        {/* Next image (underneath, shown as current fades) */}
        <img
          src={logoImages[nextImageIndex]}
          className='mt-2'
          height={250}
          width={250}
          style={{ opacity: 1 - currentOpacity }}
        />
      </div>
      <div className='flex items-center justify-center mt-2'>
        <div className='text-lg font-semibold' style={{ color: textColor }}>Loading...</div>
      </div>
      <div className='flex items-center justify-center mt-2'>
        <div className='text-md text-black'>{subText}</div>
      </div>
    </Container>
  )
}
