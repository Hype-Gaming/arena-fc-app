"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ArrowRight, Sparkles } from "lucide-react"
import type { QuizStep } from "@/lib/quiz-data"
import { PhoneRecording } from "./phone-recording"

type Props = {
  step: Extract<QuizStep, { type: "loader" }>
  onDone: () => void
}

export function AnalyzingLoader({ step, onDone }: Props) {
  const popups = step.popups ?? []
  // Each popup is triggered when the bar reaches its percentage.
  const thresholds = [17, 30, 60]
  const [percent, setPercent] = useState(0)
  const [popupIndex, setPopupIndex] = useState(0)

  const popupsDone = popupIndex >= popups.length

  // The bar can only fill up to the threshold of the next pending popup.
  // Once every popup is dismissed it is free to reach 100%.
  const cap = popupsDone ? 100 : (thresholds[popupIndex] ?? 100)

  // A popup is showing while the bar sits at (or past) its threshold and it
  // has not been dismissed yet. The fill pauses during this time.
  const isPopupOpen = !popupsDone && percent >= (thresholds[popupIndex] ?? 100)

  // Fill the progress bar slowly, pausing whenever a popup is open.
  useEffect(() => {
    if (isPopupOpen) return
    const interval = setInterval(() => {
      setPercent((p) => (p >= cap ? p : Math.min(p + 1, cap)))
    }, 110)
    return () => clearInterval(interval)
  }, [cap, isPopupOpen])

  // Finish once the bar is full and popups are dismissed.
  useEffect(() => {
    if (popupsDone && percent >= 100) {
      const t = setTimeout(onDone, 650)
      return () => clearTimeout(t)
    }
  }, [popupsDone, percent, onDone])

  const current = isPopupOpen ? popups[popupIndex] : undefined

  return (
    <div className="flex h-full flex-col items-center justify-center pt-6">
      {/* ANÁLISE EM TEMPO REAL card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent">
              <Image src="/premier-mark.png" alt="" width={20} height={20} className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-xs font-extrabold uppercase tracking-wide text-foreground">
                Análise em tempo real
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Conectando às 50+ fontes esportivas
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold text-brand-green">
            <span className="size-1.5 animate-pulse rounded-full bg-brand-green" />
            LIVE
          </span>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-end justify-between">
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Progresso da análise
              </p>
              <p className="mt-1 text-sm text-foreground text-pretty">
                Cruzando seu perfil com o banco da ARENA.
              </p>
            </div>
            <span className="text-3xl font-extrabold leading-none text-brand-green">{percent}%</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-brand-green transition-all duration-150"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Click-through popups */}
      {current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-5 backdrop-blur-sm">
          <div
            key={popupIndex}
            className="animate-pop-scale w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl"
          >
            {current.kind === "intro" ? (
              <div className="flex flex-col items-center text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-brand-green">
                  <Sparkles className="size-6" />
                </span>
                <h3 className="mt-4 text-balance text-xl font-extrabold leading-tight text-foreground">
                  {current.title}
                </h3>
                {current.subtitle && (
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {current.subtitle}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
                    <Sparkles className="size-3" />
                    {current.badge}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{current.step}</span>
                </div>
                <h3 className="mt-3 text-2xl font-extrabold leading-tight text-foreground">
                  {current.title}
                </h3>
                {current.subtitle && (
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {current.subtitle}
                  </p>
                )}
                {current.image && (
                  <div className="mt-4">
                    <PhoneRecording image={current.image} alt={current.imageAlt ?? current.title} width={188} />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setPopupIndex((i) => i + 1)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold text-primary-foreground transition active:scale-[0.98]"
            >
              {current.button}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
