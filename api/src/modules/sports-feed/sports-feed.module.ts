// api/src/modules/sports-feed/sports-feed.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SportsFeedService } from './sports-feed.service';
import { AltenarFeedProvider } from './altenar.provider';
import { SPORTS_FEED_PROVIDER } from './sports-feed.types';

/**
 * The active fixtures provider is bound here. When the official Esportiva
 * endpoint arrives, add its provider and switch this one binding — every
 * consumer depends only on the SPORTS_FEED_PROVIDER interface.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    SportsFeedService,
    AltenarFeedProvider,
    { provide: SPORTS_FEED_PROVIDER, useExisting: AltenarFeedProvider },
  ],
  exports: [SportsFeedService],
})
export class SportsFeedModule {}
