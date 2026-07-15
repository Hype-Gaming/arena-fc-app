// api/src/modules/tipster/ai/ai-analysis.types.ts

/** A pre-vetted market/pick the model may recommend (never invents odds). */
export interface AnalysisCandidate {
  id: string;
  market: string;
  selection: string;
  odd: number;
  justification: string;
}

export interface AnalysisInput {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  candidates: AnalysisCandidate[];
  /** Optional live context (Ao Vivo analyses); absent for prematch. */
  live?: {
    minute: number;
    homeScore: number;
    awayScore: number;
    status: string;
  };
}

/**
 * The AI that writes the tipster analysis. MockAnalysisProvider (deterministic
 * template) when no LLM key is set; DeepSeekAnalysisProvider when DEEPSEEK_API_KEY
 * is configured. Swappable behind AI_ANALYSIS_PROVIDER — nothing downstream
 * changes if a different model is bound.
 */
export interface AiAnalysisProvider {
  readonly name: string;
  analyze(input: AnalysisInput): Promise<string>;
}

export const AI_ANALYSIS_PROVIDER = Symbol('AI_ANALYSIS_PROVIDER');
