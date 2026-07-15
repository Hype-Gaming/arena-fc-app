"use client"

import Image from "next/image"
import { Logo } from "@/components/logo"

export function SocialProofScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="animate-pop-in space-y-6">
      <div className="flex justify-center">
        <Logo />
      </div>

      <div className="space-y-2">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-green">
          Prova real
        </span>
        <h1 className="text-pretty text-2xl font-extrabold leading-tight text-foreground">
          R$ 140 viraram R$ 2.200 em 9 dias seguindo as tips da ARENA.
        </h1>
      </div>

      <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Image
          src="/images/proof/depoimento.png"
          alt="Conversa de um usuário que transformou R$ 140 em R$ 2.200 em 9 dias usando a Arena"
          width={640}
          height={1280}
          className="h-auto w-full object-cover"
        />
        <figcaption className="space-y-3 border-t border-border p-4">
          <p className="text-sm font-bold text-card-foreground">
            Banca: <span className="text-muted-foreground line-through">R$ 140,00</span>{" "}
            <span aria-hidden>→</span> <span className="text-brand-green">R$ 2.200,00</span>{" "}
            <span className="font-medium text-muted-foreground">em 9 dias</span>
          </p>
          <p className="text-sm italic leading-relaxed text-card-foreground text-pretty">
            {'"140 pra testar, sem fé nenhuma. Em 9 dias fechou em 2.200. Tem dias que tem alguns poucos red, mas no fim do mês a conta sempre fecha positiva."'}
          </p>
        </figcaption>
      </figure>

      <button
        onClick={onContinue}
        className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
      >
        Quero esses resultados
      </button>
    </div>
  )
}
