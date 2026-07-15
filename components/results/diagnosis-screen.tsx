"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
import { getStoredAnswers } from "@/lib/quiz-data"

const CX = 110
const CY = 112
const R = 86

function polar(angle: number) {
  const rad = (angle * Math.PI) / 180
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) }
}

function arcPath(a0: number, a1: number) {
  const p0 = polar(a0)
  const p1 = polar(a1)
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  return `M ${p0.x} ${p0.y} A ${R} ${R} 0 ${large} 1 ${p1.x} ${p1.y}`
}

function Gauge({ value }: { value: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120)
    return () => clearTimeout(t)
  }, [])

  // Needle points straight up at rotation 0; rotate to reach the value angle.
  const restRotation = 90 - 180 // value 0 -> points left
  const targetRotation = 90 - (180 - (value / 100) * 180)

  return (
    <svg viewBox="0 0 220 126" className="mx-auto w-full max-w-[260px]">
      {/* track */}
      <path d={arcPath(180, 0)} fill="none" stroke="var(--secondary)" strokeWidth="16" strokeLinecap="round" />
      {/* colored segments */}
      <path d={arcPath(180, 122)} fill="none" stroke="var(--brand-red)" strokeWidth="16" />
      <path d={arcPath(120, 62)} fill="none" stroke="var(--chart-4)" strokeWidth="16" />
      <path d={arcPath(60, 0)} fill="none" stroke="var(--brand-green)" strokeWidth="16" strokeLinecap="round" />

      {/* needle */}
      <g
        style={{
          transform: `rotate(${mounted ? targetRotation : restRotation}deg)`,
          transformBox: "view-box",
          transformOrigin: `${CX}px ${CY}px`,
          transition: "transform 1.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <line x1={CX} y1={CY} x2={CX} y2={CY - R + 14} stroke="var(--brand-red)" strokeWidth="5" strokeLinecap="round" />
      </g>
      <circle cx={CX} cy={CY} r="9" fill="var(--foreground)" />
      <circle cx={CX} cy={CY} r="3.5" fill="var(--card)" />
    </svg>
  )
}

function Bar({ label, value, tone }: { label: string; value: number; tone: "bad" | "good" }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 text-sm font-medium text-card-foreground">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-out ${
            tone === "bad" ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: mounted ? `${value}%` : "0%" }}
        />
      </div>
      <span className={`w-10 shrink-0 text-right text-sm font-bold ${tone === "bad" ? "text-destructive" : "text-primary"}`}>
        {value}%
      </span>
    </div>
  )
}

export function DiagnosisScreen({ onContinue }: { onContinue: () => void }) {
  const [profile, setProfile] = useState("Apostador disciplinado")
  const [profileNote, setProfileNote] = useState("Gestão de banca em dia. Falta o dado certo pra subir de nível.")

  useEffect(() => {
    const answers = getStoredAnswers()
    if (answers["bankroll"] === "20+" || answers["bankroll"] === "none") {
      setProfile("Apostador impulsivo")
      setProfileNote("Você arrisca alto sem rede de segurança. Dá pra reverter com método.")
    } else if (answers["control"] === "often") {
      setProfile("Apostador emocional")
      setProfileNote("A emoção tá no comando. Falta o dado certo pra decidir frio.")
    }
  }, [])

  return (
    <div className="animate-pop-in space-y-5">
      <div className="space-y-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-green">
          Seu diagnóstico personalizado
        </p>
        <h1 className="text-pretty text-2xl font-extrabold leading-tight text-foreground">
          Sua taxa de acerto hoje tá no vermelho.
        </h1>
      </div>

      {/* Perfil */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
          <Image src="/premier-mark.png" alt="" width={22} height={22} className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-green">Seu perfil</p>
          <p className="text-base font-extrabold leading-tight text-card-foreground">{profile}</p>
          <p className="text-xs text-muted-foreground text-pretty">{profileNote}</p>
        </div>
      </div>

      {/* Termômetro */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent">
              <Image src="/premier-mark.png" alt="" width={18} height={18} className="h-4 w-4" />
            </span>
            <div className="text-left">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-foreground">
                Termômetro de acertos
              </p>
              <p className="text-[10px] leading-tight text-muted-foreground">
                Análise ARENA · 7 fatores avaliados
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold text-brand-green">
            <span className="size-1.5 animate-pulse rounded-full bg-brand-green" />
            LIVE
          </span>
        </div>

        <div className="bg-destructive/5 px-4 pb-5 pt-3">
          <Gauge value={23} />
          <div className="-mt-2 flex justify-between px-2 text-[10px] font-bold uppercase tracking-wide">
            <span className="text-destructive">Baixo</span>
            <span className="text-chart-4">Médio</span>
            <span className="text-primary">Alto</span>
          </div>
          <div className="mt-2 text-center">
            <p className="text-4xl font-extrabold leading-none text-destructive">23%</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-destructive">Baixo</p>
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
            <Bar label="Sua média" value={23} tone="bad" />
            <Bar label="Média usuário ARENA" value={87} tone="good" />
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="font-bold uppercase tracking-wide text-muted-foreground">Diferença</span>
              <span className="font-extrabold text-destructive">↓ -64 pts</span>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-destructive">
              <AlertCircle className="size-3.5" />
              Crítico, requer correção
            </span>
          </div>
        </div>
      </div>

      {/* Análise */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-destructive">
          A análise da ARENA sobre você
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-card-foreground text-pretty">
          Sua gestão de banca é melhor que a da maioria. O que tá faltando é a leitura do jogo, e é
          exatamente isso que a ARENA te entrega com o cruzamento de fontes.
        </p>
      </div>

      <button
        onClick={onContinue}
        className="w-full rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
      >
        Ver meu plano personalizado
      </button>
    </div>
  )
}
