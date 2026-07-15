"use client"

import type { ReactNode } from "react"

const TELEGRAM_URL = "https://t.me/arenaofc_bot?start=onboarding"

export function TelegramCta({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    // Inside an iframe (like the v0 preview), a plain target="_blank" can be
    // blocked. Break out to the top window so the link always opens.
    try {
      if (window.self !== window.top) {
        window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer")
        return
      }
    } catch {
      // Cross-origin access to window.top throws when embedded; open a new tab.
      window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer")
      return
    }
    window.location.href = TELEGRAM_URL
  }

  return (
    <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
