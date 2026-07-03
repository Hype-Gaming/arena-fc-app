// api/src/modules/tipster/ai/mock.provider.ts
import { Injectable } from '@nestjs/common';
import { composeAnalysisMessage } from '../response-composer';
import { AiAnalysisProvider, AnalysisInput } from './ai-analysis.types';

/**
 * Deterministic fallback used when no LLM key is configured (dev/tests). Keeps
 * the exact template output the app shipped with, so behaviour is unchanged
 * until a real provider is bound.
 */
@Injectable()
export class MockAnalysisProvider implements AiAnalysisProvider {
  readonly name = 'mock';

  analyze(input: AnalysisInput): Promise<string> {
    return Promise.resolve(
      composeAnalysisMessage(
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
