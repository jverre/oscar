import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Initialize with proper SSR-safe value
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT
    }
    return false
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Use mql.matches instead of window.innerWidth for better performance
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    
    // Set initial value using matchMedia
    setIsMobile(mql.matches)
    
    // Use the newer API if available, fallback for older browsers
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    } else {
      mql.addListener(onChange)
      return () => mql.removeListener(onChange)
    }
  }, [])

  return isMobile
}
