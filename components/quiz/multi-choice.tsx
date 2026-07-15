"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { QuizStep } from "@/lib/quiz-data"

type Props = {
  step: Extract<QuizStep, { type: "multi" }>
  value: string[]
  onChange: (value: string[]) => void
  onContinue: () => void
}

export function MultiChoice({ step, value, onChange, onContinue }: Props) {
  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className="flex h-full flex-col">
      <h2 className="text-balance text-left text-2xl font-extrabold leading-tight tracking-tight text-foreground">
        {step.question}
      </h2>
      {step.subtitle && (
        <p className="mt-2 text-left text-sm text-muted-foreground">
          {step.subtitle}
        </p>
      )}

      <div className="mt-7 flex flex-col gap-3">
        {step.options.map((opt) => {
          const selected = value.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left transition-all",
                selected
                  ? "border-brand-green ring-2 ring-brand-green/30"
                  : "border-border hover:border-brand-green/50",
              )}
            >
              {opt.logo && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1">
                  <Image
                    src={opt.logo || "/placeholder.svg"}
                    alt={opt.label}
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
                  />
                </span>
              )}
              {opt.badge && (
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold"
                  style={{ backgroundColor: opt.badge.bg, color: opt.badge.color ?? "#ffffff" }}
                >
                  {opt.badge.text}
                </span>
              )}
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

      <div className="mt-8">
        <Button
          size="lg"
          disabled={value.length === 0}
          onClick={onContinue}
          className="h-14 w-full rounded-2xl bg-brand-green text-base font-bold hover:bg-brand-green-dark disabled:opacity-40"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}
