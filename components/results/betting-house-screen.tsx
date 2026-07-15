"use client"

import Image from "next/image"
import { Flame } from "lucide-react"

const HOUSES = [
  { src: "/images/houses/bet365.webp", alt: "bet365" },
  { src: "/images/houses/betano.webp", alt: "Betano" },
  { src: "/images/houses/novibet.webp", alt: "Novibet" },
  { src: "/images/houses/superbet.webp", alt: "Superbet" },
  { src: "/images/houses/betnacional.webp", alt: "Betnacional" },
]

export function BettingHouseScreen({ onContinue }: { onContinue: () => void }) {
  // Duplicate the list so the marquee loops seamlessly.
  const loop = [...HOUSES, ...HOUSES]

  return (
    <div className="animate-pop-in space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-destructive">
          <Flame className="size-3.5" />
          Pega essa real
        </span>
      </div>

      <div className="relative overflow-hidden border-y border-border py-4">
        <div className="flex w-max animate-marquee items-center gap-10">
          {loop.map((h, i) => (
            <Image
              key={`${h.alt}-${i}`}
              src={h.src || "/placeholder.svg"}
              alt={h.alt}
              width={120}
              height={32}
              className="h-7 w-auto shrink-0 object-contain opacity-70 grayscale"
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />
      </div>

      <h1 className="text-pretty text-3xl font-extrabold leading-tight text-foreground">
        Você está <span className="text-destructive">sustentando uma casa de aposta</span> e nem sabe disso.
      </h1>

      <div className="space-y-3 text-base text-muted-foreground">
        <p>Você aposta na esperança e não nos dados.</p>
        <p>Esperança não paga boleto.</p>
        <p>Esperança não multiplica banca.</p>
        <p>Esperança só alimenta o ego até vir o próximo red.</p>
      </div>

      <p className="text-pretty text-lg font-bold text-foreground">
        Você quer mudar isso de verdade?
        <br />
        Continua que eu te <span className="text-primary">mostro o caminho</span>.
      </p>

      <button
        onClick={onContinue}
        className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
      >
        Quero seguir à risca e lucrar
      </button>
    </div>
  )
}
