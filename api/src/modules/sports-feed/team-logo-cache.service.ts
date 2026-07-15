// api/src/modules/sports-feed/team-logo-cache.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';

/** Public URL the frontend uses for a cached crest (proxied to the API). */
export function teamLogoUrl(externalId: number): string {
  return `/api/team-logos/${externalId}.png`;
}

/**
 * Downloads team crests once and serves them from a local disk cache, so the
 * app never hotlinks the football-API media host and logos load fast/offline.
 */
@Injectable()
export class TeamLogoCacheService {
  private readonly log = new Logger(TeamLogoCacheService.name);

  constructor(private readonly prisma: PrismaService) {}

  private dir(): string {
    return (
      process.env.TEAM_LOGO_CACHE_DIR ??
      path.join(process.cwd(), '.cache', 'team-logos')
    );
  }

  private file(externalId: number): string {
    return path.join(this.dir(), `${externalId}.png`);
  }

  /** Cached PNG bytes for a team, downloading on a miss. null → no crest. */
  async get(externalId: number): Promise<Buffer | null> {
    const file = this.file(externalId);
    try {
      return await fs.readFile(file);
    } catch {
      /* cache miss — fall through to fetch */
    }

    const team = await this.prisma.team.findUnique({
      where: { externalId },
      select: { logoUrl: true },
    });
    if (!team?.logoUrl) return null;

    return this.download(externalId, team.logoUrl);
  }

  /** Pre-fetch a crest into the cache (called during a sync). Best-effort. */
  async warm(externalId: number, sourceUrl: string): Promise<void> {
    try {
      await fs.access(this.file(externalId));
      return; // already cached
    } catch {
      /* not cached yet */
    }
    await this.download(externalId, sourceUrl);
  }

  private async download(
    externalId: number,
    sourceUrl: string,
  ): Promise<Buffer | null> {
    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) return null;
      const type = res.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.mkdir(this.dir(), { recursive: true });
      await fs.writeFile(this.file(externalId), buf);
      return buf;
    } catch (err) {
      this.log.warn(`Could not cache logo ${externalId}: ${String(err)}`);
      return null;
    }
  }
}
