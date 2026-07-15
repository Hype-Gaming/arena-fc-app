"use client"

import { Home, Smartphone, Sparkles, ArrowRight } from "lucide-react"

const MOMENTS = [
  {
    icon: Home,
    title: "Fim do mês chegando, conta no aperto.",
    desc: "Aluguel, luz, cartão. E a banca queimou no palpite errado da semana.",
  },
  {
    icon: Smartphone,
    title: "Você abre a ARENA. A tip do dia já tá pronta.",
    desc: "Bilhete montado, entrada filtrada. O sistema cruzou tudo de madrugada. Você só confirma.",
  },
  {
    icon: Sparkles,
    title: "Fim do mês. Banca crescendo, casa em paz.",
    desc: "Não é virar rico. É o aluguel pago no dia e a banca subindo todo mês.",
  },
]

export function ExperienceScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="animate-pop-in space-y-6">
      <div className="space-y-2">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary">
          Imagina assim
        </span>
        <h1 className="text-pretty text-3xl font-extrabold leading-tight text-foreground">
          Quero que você sinta o que é ter a <span className="text-primary">ARENA</span> na mão.
        </h1>
      </div>

      <div className="space-y-3">
        {MOMENTS.map((m, i) => (
          <div
            key={m.title}
            className="animate-fade-in-up flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <m.icon className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-card-foreground text-pretty">{m.title}</p>
              <p className="text-sm text-muted-foreground text-pretty">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground text-pretty">
        Porque no fim, não é só aposta. É <span className="font-bold text-foreground">escolha</span>.
      </p>

      <button
        onClick={onContinue}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
      >
        Quero a ARENA
        <ArrowRight className="size-4" />
      </button>
    </div>
  )
}
