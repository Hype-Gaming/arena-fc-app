import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PublishVersionDto } from './dto/tutorial.dto';

@Injectable()
export class TutorialService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestVersion(): Promise<number> {
    const agg = await this.prisma.tutorialStep.aggregate({ _max: { version: true } });
    return agg._max.version ?? 1;
  }

  async getLatest() {
    const version = await this.getLatestVersion();
    const steps = await this.prisma.tutorialStep.findMany({
      where: { version },
      orderBy: { order: 'asc' },
    });
    return { version, steps };
  }

  async publishVersion(dto: PublishVersionDto) {
    const latest = await this.getLatestVersion();
    const version = (await this.hasAnySteps()) ? latest + 1 : latest;
    const data = dto.steps.map((s, i) => ({
      version,
      order: i + 1,
      title: s.title,
      body: s.body,
      imageUrl: s.imageUrl,
    }));
    await this.prisma.tutorialStep.createMany({ data });
    return { version, count: data.length };
  }

  private async hasAnySteps(): Promise<boolean> {
    const agg = await this.prisma.tutorialStep.aggregate({ _max: { version: true } });
    return agg._max.version !== null && agg._max.version !== undefined;
  }
}
