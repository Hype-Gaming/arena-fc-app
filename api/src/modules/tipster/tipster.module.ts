import { Module } from '@nestjs/common';
import { TipsterController } from './tipster.controller';
import { TipsterService } from './tipster.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CreditsModule } from '../credits/credits.module';
import { AuthModule } from '../auth/auth.module';
import { AI_ANALYSIS_PROVIDER } from './ai/ai-analysis.types';
import { MockAnalysisProvider } from './ai/mock.provider';
import { DeepSeekAnalysisProvider } from './ai/deepseek.provider';

@Module({
  imports: [PrismaModule, CreditsModule, AuthModule],
  controllers: [TipsterController],
  providers: [
    TipsterService,
    MockAnalysisProvider,
    DeepSeekAnalysisProvider,
    {
      // DeepSeek when a key is set, deterministic mock otherwise. Swap the
      // binding (or add another provider) without touching TipsterService.
      provide: AI_ANALYSIS_PROVIDER,
      inject: [DeepSeekAnalysisProvider, MockAnalysisProvider],
      useFactory: (
        deepseek: DeepSeekAnalysisProvider,
        mock: MockAnalysisProvider,
      ) => (process.env.DEEPSEEK_API_KEY ? deepseek : mock),
    },
  ],
})
export class TipsterModule {}
