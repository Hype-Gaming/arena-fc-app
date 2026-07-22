// api/src/modules/sports-feed/team-logos.controller.ts
import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { TeamLogoCacheService } from './team-logo-cache.service';

/** Public crest images, served from the local cache (see TeamLogoCacheService). */
@Controller('team-logos')
export class TeamLogosController {
  constructor(private readonly cache: TeamLogoCacheService) {}

  @Get(':file')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=604800') // 7 days
  async logo(@Param('file') file: string): Promise<StreamableFile> {
    const externalId = Number.parseInt(file.replace(/\.png$/i, ''), 10);
    if (!Number.isInteger(externalId)) {
      throw new NotFoundException('Invalid logo id');
    }
    const buf = await this.cache.get(externalId);
    if (!buf) {
      throw new NotFoundException('Logo not available');
    }
    return new StreamableFile(buf, { type: 'image/png' });
  }
}
