import type { Metadata } from "next"
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleCheck,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"
import { Logo } from "@/components/logo"

export const metadata: Metadata = {
  title: "Compra confirmada · ARENA FC",
  description: "Sua conta ARENA FC está pronta. Entre com o e-mail da compra e baixe o app.",
}

export default function ObrigadoPage() {
  return (
    <main className="relative flex min-h-screen flex-col bg-[#0a1526] text-[#e7eef6]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(34,197,94,0.12),transparent_70%)]"
      />

      {/* Top bar */}
      <div className="relative border-b border-[#22c55e]/15 bg-[#0d1c30]">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-3">
          <CircleCheck className="size-4 text-[#22c55e]" aria-hidden="true" />
          <span className="text-xs font-semibold tracking-widest text-[#22c55e]">
            ARENA CONFIRMADO · ACESSE O APP
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-5 py-10 text-center sm:py-14">
        <Logo className="scale-110" />

        <div className="mt-8 flex size-20 items-center justify-center rounded-full bg-[#16a34a] shadow-[0_0_40px_rgba(34,197,94,0.45)]">
          <Check className="size-10 text-white" strokeWidth={3} aria-hidden="true" />
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-1.5">
          <Zap className="size-3.5 text-[#22c55e]" aria-hidden="true" />
          <span className="text-xs font-bold tracking-widest text-[#22c55e]">COMPRA CONFIRMADA</span>
        </div>

        <h1 className="mt-6 text-balance text-3xl font-extrabold leading-tight sm:text-4xl">
          Beleza! Sua conta já tá pronta.
        </h1>
        <p className="mt-4 max-w-md text-pretty leading-relaxed text-[#9fb2c8]">
          Entra com o e-mail que você usou na compra e baixa o app pra começar a usar a ARENA agora.
        </p>

        {/* Feature pills */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <Check className="size-4 text-[#22c55e]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#e7eef6]">Compra única</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <CircleCheck className="size-4 text-[#22c55e]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#e7eef6]">Acesso vitalício</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <ShieldCheck className="size-4 text-[#22c55e]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#e7eef6]">Garantia 30 dias</span>
          </div>
        </div>

        {/* Login card */}
        <div className="mt-8 w-full rounded-2xl border border-[#22c55e]/20 bg-white/[0.04] p-5 text-left">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#22c55e]/25 bg-[#22c55e]/10">
              <Mail className="size-5 text-[#22c55e]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-[#22c55e]">SEU LOGIN</p>
              <p className="mt-1.5 leading-relaxed text-[#9fb2c8]">
                É o <span className="font-semibold text-[#e7eef6]">mesmo e-mail</span> que você usou no checkout. Usa
                ele pra entrar no app.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <a
          href="#"
          className="group mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-[#22c55e] to-[#16a34a] px-6 py-5 text-base font-bold tracking-wide text-[#052e16] shadow-[0_10px_30px_-8px_rgba(34,197,94,0.6)] transition-transform hover:-translate-y-0.5"
        >
          <LogIn className="size-5" aria-hidden="true" />
          ENTRAR E BAIXAR O APP
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </a>

        {/* Trust row */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <div className="inline-flex items-center gap-2">
            <BadgeCheck className="size-4 text-[#22c55e]" aria-hidden="true" />
            <span className="text-sm text-[#9fb2c8]">App oficial ARENA</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <Sparkles className="size-4 text-[#22c55e]" aria-hidden="true" />
            <span className="text-sm text-[#9fb2c8]">Acesso imediato</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <Check className="size-4 text-[#22c55e]" aria-hidden="true" />
            <span className="text-sm text-[#9fb2c8]">Reembolso em 30 dias</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-6 text-center">
        <p className="text-xs text-[#6f829a]">© 2026 ARENA FC. Todos os direitos reservados.</p>
      </footer>
    </main>
  )
}
