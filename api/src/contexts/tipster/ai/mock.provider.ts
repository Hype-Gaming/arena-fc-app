// api/src/modules/tipster/ai/mock.provider.ts
import { Injectable } from '@nestjs/common';
import { composeStructuredAnalysis } from '../response-composer';
import { AiAnalysisProvider, AnalysisInput } from './ai-analysis.types';

/**
 * Deterministic fallback used when no LLM key is configured (dev/tests). Emits
 * the 4-section format (ENTRADA PRINCIPAL / ALTERNATIVAS / RESUMO / CONTEXTO)
 * the frontend renders as cards, so dev/tests look like production.
 */
@Injectable()
export class MockAnalysisProvider implements AiAnalysisProvider {
  readonly name = 'mock';

  analyze(input: AnalysisInput): Promise<string> {
    return Promise.resolve(
      composeStructuredAnalysis(
        {
          homeTeam: input.homeTeam,
          awayTeam: input.awayTeam,
          competition: input.competition,
        },
        input.candidates,
      ),
    );
  }
}
