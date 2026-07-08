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
};
