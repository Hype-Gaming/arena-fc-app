"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { QuizStep, ResearchCitation, FeatureItem, InsightBar } from "@/lib/quiz-data"
import { Quote, Layers, SlidersHorizontal, Zap, Crown } from "lucide-react"
import { useMountTrigger, useCountUp, polylineLength } from "@/hooks/use-animations"

type InsightStep = Extract<QuizStep, { type: "insight" }>

type Props = {
  step: InsightStep
  onContinue: () => void
}

export function InsightCard({ step, onContinue }: Props) {
  return (
    <div className="flex h-full flex-col pt-2">
      <div className="flex-1">
        {step.display === "retention" && <RetentionInsight step={step} />}
        {step.display === "bignumber" && <BigNumberInsight step={step} />}
        {step.display === "feature" && <FeatureInsight step={step} />}
        {step.display === "profitbars" && <ProfitBarsInsight step={step} />}
        {step.display === "emotionchart" && <EmotionChartInsight step={step} />}
      </div>

      <div className="pt-8">
        <Button
          size="lg"
          onClick={onContinue}
          className="h-14 w-full rounded-2xl bg-brand-green text-base font-bold hover:bg-brand-green-dark"
        >
          {step.cta}
        </Button>
      </div>
    </div>
  )
}

function Research({ research }: { research: ResearchCitation }) {
  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <span className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-1.5">
        {research.logo ? (
          <Image
            src={research.logo || "/placeholder.svg"}
            alt={research.brand}
            width={80}
            height={56}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-center text-[13px] font-extrabold leading-none text-[#0b2a5b]">
            {research.brand}
          </span>
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {research.tag}
        </p>
        <p className="text-sm font-bold text-foreground">{research.source}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {research.desc}
        </p>
      </div>
    </div>
  )
}

function RetentionInsight({
  step,
}: {
  step: Extract<InsightStep, { display: "retention" }>
}) {
  const mounted = useMountTrigger()
  const statNum = parseInt(step.stat, 10) || 0
  const count = useCountUp(statNum, 1200, 500)

  const W = 300
  const H = 150
  const top = 16
  const bottom = 118
  const left = 18
  const right = 286
  const n = step.chartPoints.length
  const coords = step.chartPoints.map((p, i) => {
    const x = left + (i * (right - left)) / (n - 1)
    const y = bottom - (p / 100) * (bottom - top)
    return { x, y }
  })
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ")
  const area = `${left},${bottom} ${line} ${right},${bottom}`
  const lineLen = polylineLength(coords)
  const highlightIndex = 2
  const hp = coords[highlightIndex]

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <Quote className="h-5 w-5 -scale-x-100 fill-brand-green/30 text-brand-green/30" />
        <div className="mt-1 flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-green">
            {step.label}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {step.chartTitle}
          </p>
        </div>

        <div className="relative mt-1">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={step.chartTitle}>
            <defs>
              <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-green)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--brand-green)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              points={area}
              fill="url(#retentionFill)"
              style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.6s ease 0.9s" }}
            />
            <polyline
              points={line}
              fill="none"
              stroke="var(--brand-green)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={lineLen}
              strokeDashoffset={mounted ? 0 : lineLen}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
            />
            {coords.map((c, i) =>
              i === highlightIndex ? null : (
                <circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r="4"
                  fill="var(--card)"
                  stroke="var(--brand-green)"
                  strokeWidth="2.5"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transition: `opacity 0.3s ease ${0.3 + i * 0.18}s`,
                  }}
                />
              ),
            )}
            <circle
              cx={hp.x}
              cy={hp.y}
              r="7"
              fill="none"
              stroke="var(--brand-red)"
              strokeWidth="3"
              style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease 0.8s" }}
            />
            <circle
              cx={hp.x}
              cy={hp.y}
              r="3"
              fill="var(--brand-red)"
              style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease 0.8s" }}
            />
            {step.chartLabels.map((lb, i) => {
              const x = left + (i * (right - left)) / (n - 1)
              return (
                <text
                  key={lb}
                  x={x}
                  y={H - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground font-semibold"
                  fontSize="11"
                >
                  {lb}
                </text>
              )
            })}
          </svg>
          {/* Pulsing ring + animated stat over the highlight point */}
          <span
            className="pointer-events-none absolute block h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-red/30 animate-pulse-ring"
            style={{ left: `${(hp.x / W) * 100}%`, top: `${(hp.y / H) * 100}%` }}
            aria-hidden
          />
          <span
            className="absolute text-2xl font-extrabold text-brand-red"
            style={{ left: `${(hp.x / W) * 100}%`, top: `${(hp.y / H) * 100 - 26}%` }}
          >
            {count}%
          </span>
        </div>
      </div>

      <h2 className="mt-6 text-balance text-2xl font-extrabold leading-tight tracking-tight text-foreground">
        {step.heading}
      </h2>
      <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
        {step.sub}
      </p>
      {step.research && <Research research={step.research} />}
    </div>
  )
}

function BigNumberInsight({
  step,
}: {
  step: Extract<InsightStep, { display: "bignumber" }>
}) {
  const mounted = useMountTrigger()
  const count = useCountUp(step.bigNumber, 1400, 400)
  const sites = step.sites ?? []

  // Radial layout around a center node.
  const size = 280
  const center = size / 2
  const radius = 112
  const positions = sites.map((src, i) => {
    const angle = (-90 + (360 / sites.length) * i) * (Math.PI / 180)
    return {
      src,
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    }
  })

  return (
    <div className="flex flex-col items-center pt-4 text-center">
      <div className="relative mx-auto w-full max-w-[280px]" style={{ aspectRatio: "1 / 1" }}>
        {/* connector lines */}
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full" aria-hidden>
          {positions.map((p, i) => {
            const len = Math.hypot(p.x - center, p.y - center)
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={p.x}
                y2={p.y}
                stroke="var(--brand-green)"
                strokeWidth="2"
                strokeDasharray={len}
                strokeDashoffset={mounted ? 0 : len}
                style={{
                  transition: `stroke-dashoffset 0.6s ease ${0.2 + i * 0.12}s`,
                  opacity: 0.4,
                }}
              />
            )
          })}
        </svg>

        {/* site logos */}
        {positions.map((p, i) => (
          <span
            key={p.src}
            className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-border bg-white p-1.5 shadow-sm"
            style={{
              left: `${(p.x / size) * 100}%`,
              top: `${(p.y / size) * 100}%`,
              animationDelay: `${0.25 + i * 0.12}s`,
            }}
          >
            <span className="animate-pop-scale" style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
              <Image
                src={p.src || "/placeholder.svg"}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            </span>
          </span>
        ))}

        {/* center node */}
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute inset-0 -z-10 rounded-2xl bg-brand-green/30 animate-pulse-ring" aria-hidden />
          <span className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-brand-green shadow-lg shadow-brand-green/30">
            {step.centerLogo ? (
              <Image
                src={step.centerLogo || "/placeholder.svg"}
                alt="Arena FC"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            ) : (
              <Zap className="h-8 w-8 fill-white text-white" />
            )}
          </span>
        </span>
      </div>

      <p className="mt-6 text-7xl font-extrabold tracking-tight text-brand-green">
        {step.bigPrefix}
        {count}
        {step.bigSuffix}
      </p>
      <p className="mt-2 text-lg font-bold text-foreground text-balance">{step.bigCaption}</p>
      <p className="mt-3 max-w-sm text-pretty leading-relaxed text-muted-foreground">
        {step.body}
      </p>
    </div>
  )
}

const featureIcons = {
  layers: Layers,
  sliders: SlidersHorizontal,
  zap: Zap,
}

function FeatureInsight({
  step,
}: {
  step: Extract<InsightStep, { display: "feature" }>
}) {
  return (
    <div>
      <div className="rounded-2xl bg-accent/60 p-5 text-center">
        <h2 className="text-balance text-2xl font-extrabold leading-tight tracking-tight">
          <span className="text-foreground">{step.headingDark} </span>
          <span className="text-brand-green">{step.headingGreen}</span>
        </h2>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {step.features.map((f, i) => (
          <div
            key={f.num}
            className="animate-fade-in-up"
            style={{ animationDelay: `${0.1 + i * 0.15}s` }}
          >
            <FeatureRow feature={f} />
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureRow({ feature }: { feature: FeatureItem }) {
  const Icon = featureIcons[feature.icon]
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="relative shrink-0">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-brand-green-dark">
          <Icon className="h-5 w-5" />
        </span>
        <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-[9px] font-extrabold text-white">
          {feature.num}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-bold leading-snug text-foreground">{feature.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {feature.desc}
        </p>
      </div>
    </div>
  )
}

function ProfitBarsInsight({
  step,
}: {
  step: Extract<InsightStep, { display: "profitbars" }>
}) {
  const maxAbs = Math.max(...step.bars.map((b) => Math.abs(b.value)))

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {step.label}
          </p>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide">
            <span className="flex items-center gap-1 text-brand-red">
              <span className="h-2 w-2 rounded-full bg-brand-red" />
              {step.lowLabel}
            </span>
            <span className="flex items-center gap-1 text-brand-green">
              <span className="h-2 w-2 rounded-full bg-brand-green" />
              {step.highLabel}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {step.bars.map((b, i) => (
            <ProfitBar key={b.label} bar={b} maxAbs={maxAbs} index={i} />
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <h2 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-foreground">
          {step.body[0]}
        </h2>
        {step.body.slice(1).map((p) => (
          <p key={p} className="text-pretty leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}

function ProfitBar({ bar, maxAbs, index }: { bar: InsightBar; maxAbs: number; index: number }) {
  const mounted = useMountTrigger()
  const w = (Math.abs(bar.value) / maxAbs) * 100
  const positive = bar.value >= 0
  const count = useCountUp(Math.abs(bar.value), 900, 300 + index * 120)
  const valueText = bar.valueLabel
    ? bar.valueLabel
    : `${positive ? "+" : "-"}${count}%`

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl py-1",
        bar.crown && "border-2 border-brand-green bg-brand-green/10 px-1",
      )}
    >
      <div className="flex w-[88px] shrink-0 items-center gap-1 pl-1">
        {bar.emoji && (
          <span className="text-base" aria-hidden>
            {bar.emoji}
          </span>
        )}
        <span
          className={cn(
            "truncate text-[11px] font-bold",
            bar.crown ? "text-brand-green" : "text-foreground",
          )}
        >
          {bar.label}
        </span>
      </div>
      <div className="relative h-6 flex-1">
        <div
          className={cn(
            "absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-md",
            positive ? "bg-brand-green" : "bg-brand-red",
          )}
          style={{
            width: mounted ? `${w}%` : "0%",
            transition: `width 0.9s cubic-bezier(0.22,1,0.36,1) ${0.3 + index * 0.12}s`,
          }}
        />
        {bar.crown && (
          <Crown
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 fill-brand-green text-brand-green transition-all"
            style={{ left: mounted ? `calc(${w}% + 3px)` : "0px" }}
          />
        )}
      </div>
      <span
        className={cn(
          "w-12 shrink-0 text-right text-[11px] font-bold tabular-nums",
          positive ? "text-brand-green" : "text-brand-red",
        )}
      >
        {valueText}
      </span>
    </div>
  )
}

function EmotionChartInsight({
  step,
}: {
  step: Extract<InsightStep, { display: "emotionchart" }>
}) {
  const mounted = useMountTrigger()
  const W = 300
  const H = 150
  const mid = W / 2
  const baseY = 80

  // Volatile red zigzag on the left half.
  const amps = [0, 34, -28, 40, -34, 30, -22, 16, -10, 4]
  const zigCoords = amps.map((a, i) => ({
    x: 16 + (i * (mid - 24)) / (amps.length - 1),
    y: baseY + a,
  }))
  const zig = zigCoords.map((c) => `${c.x},${c.y}`).join(" ")
  const zigLen = polylineLength(zigCoords)

  // Smooth green upward line on the right half.
  const rightX = W - 16
  const greenCoords = [
    { x: mid, y: baseY },
    { x: rightX, y: baseY - 46 },
  ]
  const greenLen = polylineLength(greenCoords)

  return (
    <div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <Quote className="h-5 w-5 -scale-x-100 fill-brand-green/30 text-brand-green/30" />
        <div className="mt-1 flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-red">
            {step.leftLabel}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-green">
            {step.rightLabel}
          </p>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${step.leftLabel} vs ${step.rightLabel}`}>
          <defs>
            <linearGradient id="emotionRed" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--brand-red)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--brand-red)" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <line
            x1={mid}
            y1="14"
            x2={mid}
            y2={H - 16}
            stroke="var(--border)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <line
            x1="16"
            y1={baseY}
            x2={W - 16}
            y2={baseY}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
          <polyline
            points={zig}
            fill="none"
            stroke="url(#emotionRed)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={zigLen}
            strokeDashoffset={mounted ? 0 : zigLen}
            style={{ transition: "stroke-dashoffset 1.1s linear" }}
          />
          <polyline
            points={`${greenCoords[0].x},${greenCoords[0].y} ${greenCoords[1].x},${greenCoords[1].y}`}
            fill="none"
            stroke="var(--brand-green)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={greenLen}
            strokeDashoffset={mounted ? 0 : greenLen}
            style={{ transition: "stroke-dashoffset 0.7s ease 1.1s" }}
          />
          <circle
            cx={rightX}
            cy={baseY - 46}
            r="4"
            fill="var(--brand-green)"
            style={{ opacity: mounted ? 1 : 0, transition: "opacity 0.3s ease 1.7s" }}
          />
        </svg>
      </div>

      <h2 className="mt-6 text-balance text-2xl font-extrabold leading-tight tracking-tight text-foreground">
        {step.heading}
      </h2>
      <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
        {step.sub}
      </p>
      {step.research && <Research research={step.research} />}
    </div>
  )
}
