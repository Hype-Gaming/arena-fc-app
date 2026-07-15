"use client"

import { useEffect, useState } from "react"
import { getStoredAnswers } from "@/lib/quiz-data"

const STATS = [
  { label: "Impulsividade", value: 82, tone: "bad" as const },
  { label: "Disciplina de banca", value: 24, tone: "bad" as const },
  { label: "Conhecimento de mercados", value: 58, tone: "mid" as const },
  { label: "Potencial de lucro", value: 91, tone: "good" as const },
]

function toneColor(tone: "bad" | "mid" | "good") {
  if (tone === "bad") return "bg-destructive"
  if (tone === "mid") return "bg-chart-4"
  return "bg-primary"
}

export function ProfileScreen({ onContinue }: { onContinue: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [profileName, setProfileName] = useState("O Apostador Emocional")

  useEffect(() => {
    setMounted(true)
    const answers = getStoredAnswers()
    if (answers["experience"] === "often") setProfileName("O Estrategista Inconstante")
    else if (answers["experience"] === "never") setProfileName("O Apostador de Sorte")
  }, [])

  return (
    <div className="animate-pop-in space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-muted-foreground">Seu perfil de apostador é</p>
        <h1 className="text-pretty text-3xl font-extrabold text-foreground">{profileName}</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Veja os pontos fortes e fracos que a nossa análise encontrou.
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        {STATS.map((stat) => (
          <div key={stat.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-card-foreground">{stat.label}</span>
              <span className="font-bold text-card-foreground">{stat.value}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${toneColor(stat.tone)} transition-[width] duration-1000 ease-out`}
                style={{ width: mounted ? `${stat.value}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-accent p-4 text-center">
        <p className="text-sm font-medium text-accent-foreground text-pretty">
          Seu potencial de lucro é alto — só falta a estratégia certa para destravar.
        </p>
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
