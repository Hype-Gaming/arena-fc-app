// web/src/screens/categoryExplainers.ts - per-category "understand this product"
// popup content, keyed by BilheteCategoria. Tapping a locked category chip with
// an entry here opens the ExplainerModal instead of jumping straight to plans.
import type { Explainer } from './ExplainerModal';

export const CATEGORY_EXPLAINERS: Record<string, Explainer> = {
  multiplas: {
    title: 'Entenda como funciona as Multiplas',
    imageSrc: '/odds-multiplas.png',
    imageAlt: 'Odds Multiplas - Arena FC',
    body: 'Odds combinadas de multiplos eventos com retorno entre 10x e 200x. Aposta de baixa entrada e potencial alto de multiplicacao.',
  },
  ultra: {
    title: 'Entenda como funciona as Odds Altas',
    imageSrc: '/alavancagem-2%20%281%29.png',
    imageAlt: 'Odds Altas - Arena FC',
    body: 'Entradas selecionadas pela IA com odds elevadas e alto potencial de retorno. Mais ousadia, mais multiplicacao - para quem busca lucros maiores no dia.',
    checkoutUrl: 'https://checkout.payt.com.br/bb0d17f48cfc7137913002d334cfe7ff',
  },
  alavancagem: {
    title: 'Entenda como funciona a Alavancagem',
    imageSrc: '/alavancagem-2%20%282%29.png',
    imageAlt: 'Alavancagem - Arena FC',
    body: 'Sequencia de 3 odds de baixo risco no mesmo dia. A cada acerto, o ganho e reinvestido no proximo, multiplicando o retorno final.',
    checkoutUrl: 'https://checkout.payt.com.br/e508405c78d7aa3b6f7c3ab41a557536',
    steps: [
      { label: 'Etapa 1', aposta: 'Aposta R$ 100', odd: 'Odd 1.5x', ganha: 'Ganha R$ 150' },
      { label: 'Etapa 2', aposta: 'Aposta R$ 150', odd: 'Odd 1.5x', ganha: 'Ganha R$ 225' },
      { label: 'Etapa 3', aposta: 'Aposta R$ 225', odd: 'Odd 1.5x', ganha: 'Ganha R$ 337' },
    ],
    footnote:
      'Cada acerto reinveste o ganho na proxima entrada, multiplicando o retorno final.',
  },
};
