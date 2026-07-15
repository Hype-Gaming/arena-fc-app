"use client"

import { useEffect, useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  Check,
  ChevronDown,
  Clock,
  Lightbulb,
  ShieldCheck,
  Star,
  Target,
  Trophy,
} from "lucide-react"
import { Logo } from "@/components/logo"

/* ---------- Countdown header ---------- */

function useDhmCountdown(totalSeconds: number) {
  const [left, setLeft] = useState(totalSeconds)
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])
  const d = Math.floor(left / 86400)
  const h = Math.floor((left % 86400) / 3600)
  const m = Math.floor((left % 3600) / 60)
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`
}

/* ---------- Data ---------- */

const CHECKOUT_URL = "https://checkout.payt.com.br/037c06e7020d3d721b416738ceb23481"

const HOJE = [
  { label: "Status da banca", value: "Caindo" },
  { label: "Decisão", value: "No chute" },
  { label: "Confiança", value: "Baixa" },
]

const COM_ARENA = [
  { label: "Status da banca", value: "Crescendo" },
  { label: "Decisão", value: "Com dado" },
  { label: "Confiança", value: "Alta" },
]

const INCLUDES = [
  {
    title: "Funcionalidade: Tips Prontas",
    desc: "Seleção diária de bilhetes montados pela IA, do conservador ao agressivo. Você escolhe o nível de risco do dia e copia.",
  },
  {
    title: "Funcionalidade: TIPS AI",
    desc: "Você pede o jogo e o tipo de retorno, a IA cruza estatística e escalação e devolve a entrada pronta com o motivo da escolha.",
  },
  {
    title: "Cruzamento com 50+ sites esportivos",
    desc: "Em tempo real, antes e durante o jogo.",
  },
  {
    title: "Acesso às principais ligas e campeonatos",
    desc: "Brasileirão, Premier League, La Liga, Champions, Libertadores e mais.",
  },
  {
    title: "Comunidade fechada de apostadores",
    desc: "Tira-dúvida e leitura de jogo dos veteranos.",
  },
  {
    title: "Acesso vitalício, sem renovação",
    desc: "Compra única. Não vira mensalidade.",
  },
]

const PAYMENTS = [
  { src: "/images/pay/visa.webp", label: "Visa" },
  { src: "/images/pay/mastercard.webp", label: "Mastercard" },
  { src: "/images/pay/applepay.webp", label: "Apple Pay" },
  { src: "/images/pay/googlepay.webp", label: "Google Pay" },
]

const MEDIA = [
  { src: "/images/media/espn-brasil.webp", label: "ESPN Brasil" },
  { src: "/images/media/tnt-sports.webp", label: "TNT Sports" },
  { src: "/images/media/cazetv.webp", label: "Cazé TV" },
  { src: "/images/media/globo.webp", label: "Globo" },
  { src: "/images/media/uol-esportes.webp", label: "UOL Esporte" },
]

const TESTIMONIALS = [
  { name: "Bruno M.", city: "Recife", stars: 5, img: "/images/leads/lead-1.webp", text: "140 pra testar, sem fé nenhuma. Em 9 dias fechou em 2.200. Tem dias que tem alguns poucos red, mas no fim do mês a conta sempre fecha positiva." },
  { name: "Lucas R.", city: "Salvador", stars: 5, img: "/images/leads/lead-2.webp", text: "Acertei 4 das 5 entradas no primeiro fim de semana. Banca tá subindo devagar, mas sem queda brusca." },
  { name: "Marcos P.", city: "São Paulo", stars: 5, img: "/images/leads/lead-3.webp", text: "Parei de gastar 2h por dia olhando estatística. Abro o app, a entrada já tá lá. No fim do mês, conta fecha." },
  { name: "Renato S.", city: "Belo Horizonte", stars: 5, img: "/images/leads/lead-4.webp", text: "Já tinha tentado tip de Telegram e gastei muito. A ARENA cobre o que eu costumava perder. Pagou o cartão do mês." },
  { name: "Diego A.", city: "Porto Alegre", stars: 5, img: "/images/leads/lead-5.webp", text: "No Brasileirão é onde mais bati green. Banca de 200 fechou em 580 num mês. Sem precisar acertar tudo, só seguir o método." },
  { name: "João V.", city: "Manaus", stars: 5, img: "/images/leads/lead-6.webp", text: "Acordo, abro o app e a tip do dia já tá lá. Pago só de manhã quando vejo que vale. Não preciso entender o jogo." },
  { name: "Patrick V.", city: "Curitiba", stars: 4, img: "/images/leads/lead-7.webp", text: "Cético no começo, achei que era papo. Hoje uso todo dia. Não é green sempre, mas no acumulado fica tranquilo." },
]

const FAQ = [
  {
    q: "Eu não entendo de futebol. Funciona pra mim?",
    a: "Funciona. A IA filtra a tip e monta o bilhete. Você só executa, sem precisar entender de tabela, mando ou estatística.",
  },
  {
    q: "É assinatura mensal?",
    a: "Não. Compra única, acesso vitalício. Você paga uma vez e nunca mais.",
  },
  {
    q: "Em qual casa de aposta a ARENA funciona?",
    a: "A ARENA monta o bilhete dentro do app, na nossa casa parceira. Você só confirma o valor.",
  },
  {
    q: "E se não funcionar pra mim?",
    a: "Você tem 30 dias de garantia. Se não gostar, devolvemos cada centavo. Sem perguntas.",
  },
]

/* ---------- Sub-components ---------- */

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 466 511.98" aria-hidden="true" className={className}>
      <path fill="#EA4335" d="M199.9 237.8 1.4 470.17c7.22 24.57 30.16 41.81 55.8 41.81 11.16 0 20.93-2.79 29.3-8.37l244.16-139.46L199.9 237.8z" />
      <path fill="#FBBC04" d="m433.91 205.1-104.65-60-111.61 110.22 113.01 108.83 104.64-58.6c18.14-9.77 30.7-29.3 30.7-50.23-1.4-20.93-13.95-40.46-32.09-50.22z" />
      <path fill="#34A853" d="M199.42 273.45 329.27 145.1 87.9 8.37C79.53 2.79 68.36 0 57.2 0 30.7 0 6.98 18.14 1.4 41.86l198.02 231.59z" />
      <path fill="#4285F4" d="M1.39 41.86C0 46.04 0 51.63 0 57.2v397.64c0 5.57 0 9.76 1.4 15.34l216.27-214.86L1.39 41.86z" />
    </svg>
  )
}

function Avatar({ name, src }: { name: string; src: string }) {
  const initials = name
    .replace(".", "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return (
    <div className="relative shrink-0">
      <img
        src={src || "/placeholder.svg"}
        alt={`Foto de ${name}`}
        className="h-24 w-20 rounded-xl object-cover"
      />
      <span className="absolute -bottom-1.5 left-1/2 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-card bg-primary text-[10px] font-bold text-primary-foreground">
        {initials}
      </span>
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5 text-chart-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-3.5 ${i < n ? "fill-current" : "opacity-30"}`} />
      ))}
    </div>
  )
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-card-foreground text-pretty">{q}</span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          {a}
        </p>
      )}
    </div>
  )
}

/* ---------- Main ---------- */

export function CheckoutScreen() {
  const timer = useDhmCountdown(3 * 86400 + 23 * 3600 + 59 * 60)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="animate-pop-in space-y-6 pb-8">
      {/* Header */}
      <header className="-mx-5 flex items-center justify-between border-b border-border px-5 pb-3">
        <Logo className="[&_span]:text-lg [&_img]:h-7 [&_img]:w-7" />
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Oferta termina em</p>
          <p className="text-sm font-extrabold text-brand-green">{timer}</p>
        </div>
      </header>

      {/* Hero */}
      <div className="space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
          <BadgePercent className="size-3.5" />
          Promo Copa 2026 · 81% OFF
        </span>
        <h1 className="text-pretty text-2xl font-extrabold leading-tight text-foreground">
          Desbloqueie seu acesso ao <span className="text-primary">Arena FC</span>.
        </h1>
      </div>

      {/* Comparison cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="overflow-hidden rounded-2xl border border-destructive/20 bg-destructive/5">
          <div className="relative">
            <img
              src="/images/antes.webp"
              alt="Apostador no prejuízo hoje, sem método"
              className="aspect-[3/4] w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-2 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-destructive px-3 py-1 text-xs font-bold uppercase text-destructive-foreground shadow-md">
              <ArrowDownRight className="size-3.5" />
              Hoje
            </span>
          </div>
          <div className="space-y-3 p-4">
            {HOJE.map((row) => (
              <div key={row.label} className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">{row.label}</p>
                <p className="text-sm font-bold text-destructive">{row.value}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-destructive/15">
                  <div className="h-full w-1/4 rounded-full bg-destructive" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-accent">
          <div className="relative">
            <img
              src="/images/depois.webp"
              alt="Apostador confiante com a banca crescendo usando a ARENA"
              className="aspect-[3/4] w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-2 mx-auto flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase text-primary-foreground shadow-md">
              <ArrowUpRight className="size-3.5" />
              Com ARENA
            </span>
          </div>
          <div className="space-y-3 p-4">
            {COM_ARENA.map((row) => (
              <div key={row.label} className="space-y-1">
                <p className="text-[11px] font-medium text-accent-foreground/70">{row.label}</p>
                <p className="text-sm font-bold text-primary">{row.value}</p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
                  <div className="h-full w-11/12 rounded-full bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Perfil / Você quer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Target className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Perfil</p>
            <p className="text-sm font-bold text-card-foreground">Emocional</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-chart-4">
            <Lightbulb className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Você quer</p>
            <p className="text-sm font-bold text-card-foreground">Fonte de dado confiável</p>
          </div>
        </div>
      </div>

      {/* Cupom */}
      <div className="rounded-2xl border border-primary/20 bg-accent p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
          <BadgePercent className="size-3.5" />
          Cupom da Copa aplicado
        </p>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-card px-3 py-2.5">
          <span className="flex items-center gap-2">
            <Check className="size-4 text-primary" />
            <span className="font-mono text-sm font-bold tracking-wide text-card-foreground">ARENA_COPA26</span>
          </span>
          <span className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">−81%</span>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Desconto aplicado automaticamente no preço abaixo. Válido até o timer zerar.
        </p>
      </div>

      {/* Pricing card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between bg-foreground px-4 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-chart-4">Oferta termina em</span>
          <span className="text-xs font-extrabold text-background">{timer}</span>
        </div>
        <div className="space-y-4 p-5 text-center">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <Trophy className="size-3.5" />
            Acesso vitalício · Compra única
          </p>
          <div>
            <p className="text-sm font-medium text-muted-foreground line-through">R$ 197,00</p>
            <p className="text-5xl font-extrabold text-primary">R$ 37,90</p>
          </div>
          <a
            href={CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
          >
            LIBERAR ACESSO À ARENA
          </a>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-md border border-border bg-secondary px-2 py-1.5 text-[10px] font-bold text-muted-foreground">Pix</span>
            {PAYMENTS.map((p) => (
              <span key={p.label} className="flex h-7 items-center justify-center rounded-md border border-border bg-card px-2">
                <img src={p.src || "/placeholder.svg"} alt={p.label} className="h-4 w-auto object-contain" />
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-pretty">
            Compra processada com criptografia. Você não compartilha dados de cartão com a gente.
          </p>
        </div>
      </div>

      {/* Includes */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
          <Check className="size-3.5" />
          O que tá incluso
        </p>
        {INCLUDES.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3" />
            </span>
            <div>
              <p className="text-sm font-bold text-card-foreground text-pretty">{item.title}</p>
              <p className="text-xs text-muted-foreground text-pretty">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Guarantee */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-accent p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-accent-foreground">Garantia de 30 dias</p>
          <p className="text-xs text-accent-foreground/80 text-pretty">
            Se você não gostar da ARENA nos primeiros 30 dias, devolvemos cada centavo. Sem pergunta, sem letra miúda.
          </p>
        </div>
      </div>

      {/* Community */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Logo iconOnly />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Comunidade ARENA</p>
            <p className="text-base font-extrabold text-card-foreground">+12.000 apostadores ativos em 2025.</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Stars n={5} />
              <span className="text-xs font-semibold text-muted-foreground">4.9 / 5</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-border pt-4">
          <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-background">
            <AppleIcon className="size-5" />
            <span className="text-left leading-none">
              <span className="block text-[9px] font-medium">Baixar na</span>
              <span className="block text-sm font-bold">App Store</span>
            </span>
          </span>
          <span className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-background">
            <GooglePlayIcon className="size-5" />
            <span className="text-left leading-none">
              <span className="block text-[9px] font-medium">Disponível no</span>
              <span className="block text-sm font-bold">Google Play</span>
            </span>
          </span>
        </div>
      </div>

      {/* Ambassador */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary">Embaixador oficial</span>
          <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Atlético-MG</span>
        </div>
        <div className="flex items-center gap-3">
          <img
            src="/images/savel.webp"
            alt="Foto de Fellipe Sável, embaixador oficial da Arena FC"
            className="size-12 shrink-0 rounded-full object-cover"
          />
          <div>
            <p className="text-base font-extrabold text-card-foreground">Fellipe Sável</p>
            <p className="text-xs text-muted-foreground text-pretty">
              Maior criador de conteúdo do Atlético Mineiro. Usa a ARENA no dia a dia e recomenda pra audiência dele.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
          {[
            ["176 mil", "Instagram"],
            ["412 mil", "TikTok"],
            ["48 mil", "YouTube"],
          ].map(([n, label]) => (
            <div key={label}>
              <p className="text-base font-extrabold text-card-foreground">{n}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-chart-4">
          <Star className="size-3.5 fill-current" />
          O que os usuários dizem
        </p>
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="flex items-start gap-4 border-t border-border pb-2 pt-4 first:border-t-0 first:pt-0">
            <Avatar name={t.name} src={t.img} />
            <div className="space-y-1">
              <p className="text-sm text-card-foreground text-pretty">{`"${t.text}"`}</p>
              <Stars n={t.stars} />
              <p className="text-xs font-bold text-card-foreground">
                {t.name} <span className="font-medium text-muted-foreground">{t.city}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Media */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
          <Trophy className="size-3.5" />
          A ARENA na mídia
        </p>
        <div className="-mx-5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-marquee gap-3 px-5">
            {[...MEDIA, ...MEDIA].map((m, i) => (
              <span
                key={`${m.label}-${i}`}
                className="flex h-14 w-24 shrink-0 items-center justify-center rounded-xl bg-secondary px-3"
              >
                <img src={m.src || "/placeholder.svg"} alt={m.label} className="h-7 w-auto object-contain" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
          <ChevronDown className="size-3.5" />
          Principais dúvidas
        </p>
        {FAQ.map((item, i) => (
          <FaqItem
            key={item.q}
            q={item.q}
            a={item.a}
            open={openFaq === i}
            onToggle={() => setOpenFaq(openFaq === i ? null : i)}
          />
        ))}
      </div>

      {/* Final CTA */}
      <a
        href={CHECKOUT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]"
      >
        PEGAR MEU DESCONTO E LIBERAR
        <ArrowUpRight className="size-4" />
      </a>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-4 pt-2 text-center">
        <div className="flex items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <Stars n={5} />
          <span className="text-sm font-bold text-card-foreground">4.9</span>
          <span className="text-sm text-muted-foreground">+12.000 apostadores</span>
        </div>
        <p className="max-w-xs text-pretty text-xs leading-relaxed text-muted-foreground">
          A aposta é executada dentro do app, na casa parceira. Conteúdo destinado a maiores de 18 anos. Aposte com
          responsabilidade. Plano sugerido pra resolver: não confio nas fontes.
        </p>
        <p className="text-[11px] text-muted-foreground">arena fc - todos os direitos reservados</p>
      </footer>
    </div>
  )
}
