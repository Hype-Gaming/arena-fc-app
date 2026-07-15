"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import confetti from "canvas-confetti"
import { ArrowRight, Clock, Trophy } from "lucide-react"
import { ScratchCard } from "@/components/results/scratch-card"

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])
  const m = String(Math.floor(left / 60)).padStart(2, "0")
  const s = String(left % 60).padStart(2, "0")
  return `${m}:${s}`
}

function fireRisingConfetti() {
  const colors = ["#22c55e", "#16a34a", "#eab308", "#facc15", "#ffffff"]
  const end = Date.now() + 900
  const frame = () => {
    // Two fountains rising from the bottom corners.
    confetti({
      particleCount: 5,
      angle: 75,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 1 },
      colors,
    })
    confetti({
      particleCount: 5,
      angle: 105,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 1 },
      colors,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export function OfferScreen({ onContinue }: { onContinue: () => void }) {
  const time = useCountdown(15 * 60)
  const [revealed, setRevealed] = useState(false)

  const handleReveal = useCallback(() => {
    setRevealed(true)
    fireRisingConfetti()
  }, [])

  return (
    <div className="animate-pop-in space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center">
          <Image
            src="/images/copa-2026.webp"
            alt="Logo oficial da Copa do Mundo FIFA 2026"
            width={100}
            height={132}
            className="h-28 w-auto object-contain"
            priority
          />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
          <Trophy className="size-3.5" />
          Promoção Copa do Mundo 2026
        </span>
        <h1 className="text-pretty text-2xl font-extrabold leading-tight text-foreground">
          Raspe e ganhe até <span className="text-primary">98% de desconto</span> na ARENA.
        </h1>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
          <Clock className="size-3.5" />
          Oferta expira em {time}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 pb-8">
        <ScratchCard onReveal={handleReveal} />
      </div>

      {revealed && (
        <div className="animate-fade-in-up space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-accent p-4">
            <Trophy className="mt-0.5 size-5 shrink-0 text-chart-4" />
            <p className="text-sm font-medium text-accent-foreground text-pretty">
              Boa! Seu desconto da Copa já tá guardado na próxima página.
            </p>
          </div>
          <button
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
          >
            Pegar meu desconto e liberar
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
