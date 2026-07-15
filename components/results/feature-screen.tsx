"use client"

import Image from "next/image"
import { Check } from "lucide-react"

interface FeatureScreenProps {
  badge: string
  title: string
  description: string
  image: string
  imageAlt: string
  bullets: string[]
  onContinue: () => void
}

export function FeatureScreen({ badge, title, description, image, imageAlt, bullets, onContinue }: FeatureScreenProps) {
  return (
    <div className="animate-pop-in space-y-6">
      <div className="space-y-2 text-center">
        <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          {badge}
        </span>
        <h1 className="text-pretty text-2xl font-bold leading-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Image
          src={image || "/placeholder.svg"}
          alt={imageAlt}
          width={420}
          height={520}
          className="h-auto w-full object-cover"
        />
      </div>

      <div className="space-y-3">
        {bullets.map((b) => (
          <div key={b} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
              <Check className="size-3 text-primary-foreground" />
            </span>
            <span className="text-sm text-foreground text-pretty">{b}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
      >
        Continuar
      </button>
    </div>
  )
}
