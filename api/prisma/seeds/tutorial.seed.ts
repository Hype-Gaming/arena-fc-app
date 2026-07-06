import { PrismaClient } from '@prisma/client';

const TUTORIAL_VERSION = 3;

const STEPS = [
  {
    order: 1,
    title: 'Bem-vindo a Arena',
    body: 'Aqui voce acompanha bilhetes, entradas especiais e a IA Tipster no mesmo lugar.',
  },
  {
    order: 2,
    title: 'Desbloqueie tudo pelo Telegram',
    body: 'Entre no canal oficial, aguarde 10 minutos e ative o plano Diamante para liberar o app completo.',
  },
  {
    order: 3,
    title: 'Use o Diamante',
    body: 'Com o acesso completo voce abre categorias avancadas, multiplas, alavancagem e probabilidades Ultra.',
  },
];

export async function seedTutorial(
  prisma: Pick<PrismaClient, 'tutorialStep'>,
): Promise<void> {
  await prisma.tutorialStep.createMany({
    data: STEPS.map((step) => ({
      version: TUTORIAL_VERSION,
      ...step,
    })),
    skipDuplicates: true,
  });
}
