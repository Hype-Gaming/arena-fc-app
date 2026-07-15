"use client"

import { useEffect, useRef, useState } from "react"

interface ScratchCardProps {
  onReveal: () => void
  width?: number
  height?: number
}

export function ScratchCard({ onReveal, width = 320, height = 150 }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const revealed = useRef(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Gold -> green diagonal foil, matching the original promo card.
    const grad = ctx.createLinearGradient(0, 0, width, height)
    grad.addColorStop(0, "#eab308")
    grad.addColorStop(0.55, "#65a30d")
    grad.addColorStop(1, "#15803d")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    // Soft sparkle bubbles.
    ctx.fillStyle = "rgba(255,255,255,0.12)"
    const bubbles = [
      [40, 34, 16],
      [width - 54, 30, 12],
      [width - 40, height - 34, 20],
      [56, height - 30, 10],
    ]
    for (const [bx, by, br] of bubbles) {
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI * 2)
      ctx.fill()
    }

    // Headline text.
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 17px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("RASPE PRA REVELAR  \u26bd", width / 2, height / 2)

    ctx.globalCompositeOperation = "destination-out"
  }, [width, height])

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function scratch(e: React.PointerEvent) {
    if (!drawing.current || revealed.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.arc(x, y, 24, 0, Math.PI * 2)
    ctx.fill()
    measure()
  }

  function measure() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const dpr = window.devicePixelRatio || 1
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let clear = 0
    const step = 16
    for (let i = 3; i < data.length; i += 4 * step) {
      if (data[i] === 0) clear++
    }
    const total = data.length / (4 * step)
    const pct = Math.round((clear / total) * 100)
    setProgress(pct)
    if (pct > 55 && !revealed.current) {
      revealed.current = true
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      onReveal()
    }
  }

  return (
    <div className="mx-auto flex flex-col items-center" style={{ width }}>
      <div className="relative" style={{ width, height }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-accent to-primary/15 text-center">
          <span className="text-xs font-medium text-accent-foreground">Seu desconto exclusivo</span>
          <span className="text-4xl font-extrabold text-primary">97% OFF</span>
          <span className="mt-0.5 text-[11px] font-semibold text-accent-foreground">Promoção Copa do Mundo 2026</span>
        </div>
        <canvas
          ref={canvasRef}
          style={{ width, height, touchAction: "none" }}
          className="absolute inset-0 cursor-grab rounded-xl active:cursor-grabbing"
          onPointerDown={(e) => {
            drawing.current = true
            ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
            scratch(e)
          }}
          onPointerMove={scratch}
          onPointerUp={() => (drawing.current = false)}
          onPointerLeave={() => (drawing.current = false)}
        />
      </div>

      {progress < 55 && (
        <div className="mt-4 w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(progress * 1.8, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs font-medium text-primary">
            Continue raspando — {Math.min(Math.round(progress * 1.8), 100)}%
          </p>
        </div>
      )}
    </div>
  )
}
