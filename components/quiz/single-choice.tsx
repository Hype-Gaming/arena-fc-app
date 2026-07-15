"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { Check, X, Zap } from "lucide-react"
import type { QuizStep } from "@/lib/quiz-data"

type Props = {
  step: Extract<QuizStep, { type: "single" }>
  value?: string
  onSelect: (value: string) => void
}

export function SingleChoice({ step, value, onSelect }: Props) {
  const isImageGrid = step.layout === "imagegrid"

  return (
    <div>
      <h2 className="text-balance text-left text-2xl font-extrabold leading-tight tracking-tight text-foreground">
        {step.question}
      </h2>
      {step.subtitle && !step.extra && (
        <p className="mt-2 text-left text-sm text-muted-foreground">
          {step.subtitle}
        </p>
      )}

      {step.extra && (
        <div className="mt-5 rounded-2xl border border-brand-green/30 bg-accent/50 p-5">
          {step.subtitle && (
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white">
                <Zap className="h-4 w-4 fill-current" />
              </span>
              <p className="pt-1 text-left font-bold leading-snug text-foreground">
                {step.subtitle}
              </p>
            </div>
          )}
          <div className="my-4 h-px bg-brand-green/20" />
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {step.extra.title}
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {step.extra.items.map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-red/15 text-brand-red">
                  <X className="h-3 w-3" />
                </span>
                <span className="text-sm font-medium text-muted-foreground line-through">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isImageGrid ? (
        <div className="mt-6 grid grid-cols-2 gap-4">
          {step.options.map((opt) => {
            const selected = value === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={cn(
                  "overflow-hidden rounded-2xl border-2 bg-card text-left transition-all",
                  selected
                    ? "border-brand-green ring-2 ring-brand-green/30"
                    : "border-border hover:border-brand-green/50",
                )}
              >
                {opt.image && (
                  <div className="relative aspect-square w-full">
                    <Image
                      src={opt.image || "/placeholder.svg"}
                      alt={opt.label}
                      fill
                      sizes="(max-width: 420px) 50vw, 210px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 p-3">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selected
                        ? "border-brand-green bg-brand-green text-white"
                        : "border-border",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="font-bold">{opt.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-7 flex flex-col gap-3">
          {step.options.map((opt) => {
            const selected = value === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left transition-all",
                  selected
                    ? "border-brand-green ring-2 ring-brand-green/30"
                    : "border-border hover:border-brand-green/50",
                )}
              >
                {opt.emoji && (
                  <span className="text-2xl" aria-hidden>
                    {opt.emoji}
                  </span>
                )}
                <span className="flex-1 font-semibold">{opt.label}</span>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selected
                      ? "border-brand-green bg-brand-green text-white"
                      : "border-border",
                  )}
                >
                  {selected && <Check className="h-4 w-4" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
