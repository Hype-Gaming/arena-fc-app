"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DiagnosisScreen } from "@/components/results/diagnosis-screen"
import { ProfileScreen } from "@/components/results/profile-screen"
import { BettingHouseScreen } from "@/components/results/betting-house-screen"
import { SocialProofScreen } from "@/components/results/social-proof-screen"
import { ExperienceScreen } from "@/components/results/experience-screen"
import { OfferScreen } from "@/components/results/offer-screen"
import { CheckoutScreen } from "@/components/results/checkout-screen"

type Stage =
  | "diagnosis"
  | "profile"
  | "house"
  | "proof"
  | "experience"
  | "offer"
  | "checkout"

const ORDER: Stage[] = [
  "diagnosis",
  "profile",
  "house",
  "proof",
  "experience",
  "offer",
  "checkout",
]

export function ResultsFlow() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("diagnosis")
  const [hasAnswers, setHasAnswers] = useState<boolean | null>(null)

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem("premier_quiz") : null
    setHasAnswers(Boolean(raw))
  }, [])

  function next() {
    const idx = ORDER.indexOf(stage)
    if (idx < ORDER.length - 1) {
      setStage(ORDER[idx + 1])
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  if (hasAnswers === false) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-medium text-foreground text-balance">
          Precisamos conhecer seu perfil antes de gerar o diagnóstico.
        </p>
        <button
          onClick={() => router.push("/quiz")}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Fazer o teste
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      {stage === "diagnosis" && <DiagnosisScreen onContinue={next} />}
      {stage === "profile" && <ProfileScreen onContinue={next} />}
      {stage === "house" && <BettingHouseScreen onContinue={next} />}
      {stage === "proof" && <SocialProofScreen onContinue={next} />}
      {stage === "experience" && <ExperienceScreen onContinue={next} />}
      {stage === "offer" && <OfferScreen onContinue={next} />}
      {stage === "checkout" && <CheckoutScreen />}
    </div>
  )
}
