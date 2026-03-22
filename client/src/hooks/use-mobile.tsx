import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", check)
    window.addEventListener("resize", check)
    window.addEventListener("orientationchange", () => {
      setTimeout(check, 100)
    })
    check()
    return () => {
      mql.removeEventListener("change", check)
      window.removeEventListener("resize", check)
    }
  }, [])

  return !!isMobile
}
