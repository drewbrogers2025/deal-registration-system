'use client'

import { useState, useEffect } from 'react'

export interface ScreenSize {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isSmallMobile: boolean
  isLargeMobile: boolean
}

const BREAKPOINTS = {
  smallMobile: 480,
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const

export function useMobileDetection() {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isSmallMobile: false,
    isLargeMobile: false,
  })

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      const isSmallMobile = width < BREAKPOINTS.smallMobile
      const isMobile = width < BREAKPOINTS.mobile
      const isTablet = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet
      const isDesktop = width >= BREAKPOINTS.tablet
      const isLargeMobile = width >= BREAKPOINTS.smallMobile && width < BREAKPOINTS.mobile

      setScreenSize({
        width,
        height,
        isMobile,
        isTablet,
        isDesktop,
        isSmallMobile,
        isLargeMobile,
      })
    }

    // Initial check
    updateScreenSize()

    // Add event listener
    window.addEventListener('resize', updateScreenSize)

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return screenSize
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    const updateMatch = () => setMatches(media.matches)
    
    // Initial check
    updateMatch()
    
    // Add listener
    media.addEventListener('change', updateMatch)
    
    // Cleanup
    return () => media.removeEventListener('change', updateMatch)
  }, [query])

  return matches
}

// Predefined media queries
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsSmallScreen = () => useMediaQuery('(max-width: 1023px)')
export const useIsLargeScreen = () => useMediaQuery('(min-width: 1280px)')

// Touch device detection
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      )
    }

    setIsTouchDevice(checkTouchDevice())
  }, [])

  return isTouchDevice
}

// Orientation detection
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)

    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return orientation
}
