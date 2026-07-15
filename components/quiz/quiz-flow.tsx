"use client"

import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { Logo } from "@/components/logo"
import { quizSteps, QUESTION_TOTAL } from "@/lib/quiz-data"
import { SingleChoice } from "./single-choice"
import { MultiChoice } from "./multi-choice"
import { InsightCard } from "./insight-card"
import { AnalyzingLoader } from "./analyzing-loader"
import { ChevronLeft } from "lucide-react"

export function QuizFlow() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})

  const step = quizSteps[index]
  const total = quizSteps.length

  // Question number used for both the label and the progress bar.
  // Insight/loader screens keep the number of the nearest preceding question.
  const questionNumber = useMemo(() => {
    for (let i = index; i >= 0; i--) {
      const s = quizSteps[i]
      if (s.type === "single" || s.type === "multi") return s.number
    }
    return 0
  }, [index])

  const progress = useMemo(
    () => Math.round((questionNumber / QUESTION_TOTAL) * 100),
    [questionNumber],
  )

  const goNext = useCallback(() => {
    if (index < total - 1) {
      setIndex((i) => i + 1)
      if (typeof window !== "undefined") window.scrollTo({ top: 0 })
    } else {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("premier_quiz", JSON.stringify(answers))
      }
      router.push("/resultado")
    }
  }, [index, total, answers, router])

  const goBack = useCallback(() => {
    if (index === 0) {
      router.push("/")
      return
    }
    setIndex((i) => i - 1)
  }, [index, router])

  const setAnswer = useCallback(
    (id: string, value: string | string[]) => {
      setAnswers((prev) => ({ ...prev, [id]: value }))
    },
    [],
  )

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      {/* Progress header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-[420px] px-5 py-4">
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={goBack}
              aria-label="Voltar"
              className="absolute left-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <Logo className="scale-90" />
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-brand-green transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-5 py-6">
        {(step.type === "single" || step.type === "multi") && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-brand-green">
            Pergunta {step.number} de {QUESTION_TOTAL}
            {step.number === QUESTION_TOTAL && (
              <span className="text-muted-foreground"> · Última</span>
            )}
          </p>
        )}

        <div key={step.id} className="flex-1 animate-pop-in">
          {step.type === "single" && (
            <SingleChoice
              step={step}
              value={answers[step.id] as string | undefined}
              onSelect={(v) => {
                setAnswer(step.id, v)
                setTimeout(goNext, 220)
              }}
            />
          )}
          {step.type === "multi" && (
            <MultiChoice
              step={step}
              value={(answers[step.id] as string[]) ?? []}
              onChange={(v) => setAnswer(step.id, v)}
              onContinue={goNext}
            />
          )}
          {step.type === "insight" && (
            <InsightCard step={step} onContinue={goNext} />
          )}
          {step.type === "loader" && <AnalyzingLoader step={step} onDone={goNext} />}
        </div>
      </div>
    </main>
  )
}
