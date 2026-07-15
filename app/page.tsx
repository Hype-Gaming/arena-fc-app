import Link from "next/link"
import { Logo } from "@/components/logo"
import { Star, Lock } from "lucide-react"

const partnerLogos = [
  { src: "/logos/oddspedia.webp", alt: "Oddspedia" },
  { src: "/logos/transfermarkt.webp", alt: "Transfermarkt" },
  { src: "/logos/sofascore.webp", alt: "Sofascore" },
  { src: "/logos/academia-apostas.webp", alt: "Academia das Apostas" },
  { src: "/logos/srgoll.webp", alt: "Sr. Goool" },
  { src: "/logos/fotmob.webp", alt: "FotMob" },
  { src: "/logos/soccerstats.webp", alt: "SoccerSTATS" },
  { src: "/logos/fbref.webp", alt: "FBref" },
  { src: "/logos/flashscore.webp", alt: "Flashscore" },
  { src: "/logos/footstats.webp", alt: "Footstats" },
  { src: "/logos/esporte-interativo.webp", alt: "Esporte Interativo" },
]

export default function HomePage() {
  return (
    <main
      className="min-h-dvh bg-background"
      style={{
        backgroundImage:
          "radial-gradient(at 18% 22%, rgba(34, 197, 94, 0.18) 0px, rgba(0, 0, 0, 0) 55%), radial-gradient(at 82% 8%, rgba(0, 199, 102, 0.14) 0px, rgba(0, 0, 0, 0) 50%), radial-gradient(at 50% 90%, rgba(15, 27, 46, 0.08) 0px, rgba(0, 0, 0, 0) 60%), radial-gradient(at 88% 78%, rgba(34, 197, 94, 0.1) 0px, rgba(0, 0, 0, 0) 55%)",
        backgroundAttachment: "fixed",
      }}
    >
      <header className="mx-auto flex max-w-md items-center justify-between gap-3 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
          <Logo iconOnly className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1.5 text-xs font-bold shadow-sm">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            4.9
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background">
            <svg viewBox="0 0 384 512" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            App Store
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-background">
            <svg viewBox="0 0 512 512" className="h-3.5 w-3.5" aria-hidden="true">
              <path fill="#00d3ff" d="M47.6 23.4C40.6 30.2 36.5 40.8 36.5 54.5v403c0 13.7 4.1 24.3 11.1 31.1l1.4 1.3 225.9-225.9v-5.3L48.9 22.1z" />
              <path fill="#00f076" d="M349.3 339.5l-75.4-75.4v-5.3l75.4-75.5 1.7 1 89.3 50.7c25.5 14.5 25.5 38.2 0 52.7l-89.3 50.7z" />
              <path fill="#ffce00" d="M351 338.5L273.9 261.5 47.6 487.6c8.4 8.9 22.3 10 38 1.1z" />
              <path fill="#ff3a44" d="M351 184.5L85.6 33.3c-15.7-8.9-29.6-7.8-38 1.1l226.3 226.1z" />
            </svg>
            Google Play
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-md px-5 pb-8 pt-6 text-center">
        <div className="flex justify-center">
          <Logo className="scale-110" />
        </div>
        <h1
          className="mt-8 text-balance font-semibold text-foreground"
          style={{
            fontSize: "44px",
            lineHeight: "1.08",
            letterSpacing: "-1.1px",
          }}
        >
          A IA de previsão esportiva, que analisa as estatísticas por você.
        </h1>
        <p
          className="mx-auto mt-6 max-w-xs text-pretty font-normal text-muted-foreground"
          style={{ fontSize: "15.5px", lineHeight: "1.5" }}
        >
          +50 sites esportivos analisados em tempo real. Entrada pronta no app,
          com um clique.
        </p>

        <div className="mt-8">
          <Link
            href="/quiz"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green py-4.5 font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-brand-green/30 transition hover:bg-brand-green-dark active:scale-[0.98]"
            style={{ fontSize: "16px" }}
          >
            <Lock className="h-4 w-4" />
            Liberar acesso à Arena
          </Link>
        </div>

        <div className="mt-9">
          <p
            className="font-semibold uppercase text-label"
            style={{ fontSize: "10px", letterSpacing: "1.6px" }}
          >
            Sites que a Arena cruza em tempo real
          </p>
          <div
            className="relative mt-5 overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
            }}
          >
            <div className="flex w-max animate-marquee items-center gap-10">
              {[...partnerLogos, ...partnerLogos].map((logo, i) => (
                <img
                  key={`${logo.alt}-${i}`}
                  src={logo.src || "/placeholder.svg"}
                  alt={logo.alt}
                  className="h-7 w-auto shrink-0 object-contain opacity-70"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-4 max-w-md border-t border-border px-8 py-7">
        <p className="text-center text-[12px] leading-relaxed text-faint">
          A aposta é executada dentro do app, na casa parceira EsportivaBet.
          Conteúdo destinado a maiores de 18 anos. Aposte com responsabilidade.
        </p>
      </footer>
    </main>
  )
}
