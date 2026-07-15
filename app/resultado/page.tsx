import { Suspense } from "react"
import { ResultsFlow } from "@/components/results/results-flow"

export default function ResultadoPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <ResultsFlow />
    </Suspense>
  )
}
