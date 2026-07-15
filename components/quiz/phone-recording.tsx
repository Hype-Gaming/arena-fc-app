"use client"

type Props = {
  image: string
  alt: string
  width?: number
  className?: string
}

/**
 * A small phone mockup that plays the real app screen-recording GIF, with a
 * live "REC" badge. The GIF plays natively (no fake scroll animation), so it
 * matches the original recording exactly.
 */
export function PhoneRecording({ image, alt, width = 156, className }: Props) {
  return (
    <div
      style={{ width }}
      className={`relative mx-auto overflow-hidden rounded-[28px] border-4 border-foreground/90 bg-foreground/90 shadow-xl ${className ?? ""}`}
    >
      {/* notch */}
      <div className="absolute left-1/2 top-1 z-20 h-1.5 w-12 -translate-x-1/2 rounded-full bg-background/40" />

      {/* live badge */}
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-brand-red px-1.5 py-0.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        <span className="text-[8px] font-bold uppercase tracking-wide text-white">REC</span>
      </div>

      {/* screen — plays the real recording */}
      <div className="relative overflow-hidden rounded-[22px] bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image || "/placeholder.svg"}
          alt={alt}
          className="block w-full"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  )
}
