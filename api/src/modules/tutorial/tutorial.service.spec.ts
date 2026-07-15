import { TutorialService } from './tutorial.service';

describe('TutorialService', () => {
  let prisma: any;
  let service: TutorialService;

  beforeEach(() => {
    prisma = {
      tutorialStep: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    service = new TutorialService(prisma);
  });

  it('returns 1 as latest version when there are no steps', async () => {
    prisma.tutorialStep.aggregate.mockResolvedValue({ _max: { version: null } });
    expect(await service.getLatestVersion()).toBe(1);
  });

  it('returns the max version when steps exist', async () => {
    prisma.tutorialStep.aggregate.mockResolvedValue({ _max: { version: 3 } });
    expect(await service.getLatestVersion()).toBe(3);
  });

  it('fetches latest steps ordered by order', async () => {
    prisma.tutorialStep.aggregate.mockResolvedValue({ _max: { version: 2 } });
    prisma.tutorialStep.findMany.mockResolvedValue([{ order: 1 }, { order: 2 }]);
    const res = await service.getLatest();
    expect(prisma.tutorialStep.findMany).toHaveBeenCalledWith({
      where: { version: 2 },
      orderBy: { order: 'asc' },
    });
    expect(res).toEqual({ version: 2, steps: [{ order: 1 }, { order: 2 }] });
  });

  it('publishes a new version = latest+1 replacing nothing, ordering steps', async () => {
    prisma.tutorialStep.aggregate.mockResolvedValue({ _max: { version: 2 } });
    prisma.tutorialStep.createMany.mockResolvedValue({ count: 2 });
    const res = await service.publishVersion({
      steps: [
        { title: 'T1', body: 'B1' },
        { title: 'T2', body: 'B2', imageUrl: 'u' },
      ],
    });
    expect(prisma.tutorialStep.createMany).toHaveBeenCalledWith({
      data: [
        { version: 3, order: 1, title: 'T1', body: 'B1', imageUrl: undefined },
        { version: 3, order: 2, title: 'T2', body: 'B2', imageUrl: 'u' },
      ],
    });
    expect(res.version).toBe(3);
  });
});
