// web/src/screens/categoryExplainers.ts — per-category "understand this product"
// popup content, keyed by BilheteCategoria. Tapping a category chip with an
// entry here opens the ExplainerModal instead of jumping to the paywall.
// Drop the matching art in web/public/ (odds-multiplas.png, odds-altas.png, …).
import type { Explainer } from './ExplainerModal';

export const CATEGORY_EXPLAINERS: Record<string, Explainer> = {
  multiplas: {
    title: 'Entenda como funciona as Múltiplas',
    imageSrc: '/odds-multiplas.png',
    imageAlt: 'Odds Múltiplas — Arena FC',
    body: 'Odds combinadas de múltiplos eventos com retorno entre 10x e 200x. Aposta de baixa entrada e potencial alto de multiplicação.',
  },
  ultra: {
    title: 'Entenda como funciona as Odds Altas',
    imageSrc: '/odds-altas.png',
    imageAlt: 'Odds Altas — Arena FC',
    body: 'Entradas selecionadas pela IA com odds elevadas e alto potencial de retorno. Mais ousadia, mais multiplicação — para quem busca lucros maiores no dia.',
  },
  alavancagem: {
    title: 'Entenda como funciona a Alavancagem',
    // Popup art — troque este arquivo pela imagem final da Alavancagem.
    imageSrc: '/Alavancagem.png',
    imageAlt: 'Alavancagem — Arena FC',
    body: 'Sequência de 3 odds de baixo risco no mesmo dia. A cada acerto, o ganho é reinvestido no próximo, multiplicando o retorno final.',
    steps: [
      { label: 'Etapa 1', aposta: 'Aposta R$ 100', odd: 'Odd 1.5x', ganha: 'Ganha R$ 150' },
      { label: 'Etapa 2', aposta: 'Aposta R$ 150', odd: 'Odd 1.5x', ganha: 'Ganha R$ 225' },
      { label: 'Etapa 3', aposta: 'Aposta R$ 225', odd: 'Odd 1.5x', ganha: 'Ganha R$ 337' },
    ],
    footnote:
      'Cada acerto reinveste o ganho na próxima entrada, multiplicando o retorno final.',
  },
};
