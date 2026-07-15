// api/src/modules/bilhetes/bilhetes.constants.ts
import { BilheteCategoria } from '@prisma/client';

export interface CategoriaDef {
  key: BilheteCategoria;
  /** Chip label shown on the sport page. */
  label: string;
  /** Tier badge shown on the card (internally the risk level — never worded as risk to users). */
  tierLabel: string;
  /** Minimum Plan.rank required to open this category (free=0, premium=1, diamante=2). */
  minRank: number;
}

/**
 * Single source of truth for category → plan gating.
 * Mirrors the plan-comparison screen: Livre sees the safe picks, Premium
 * unlocks Pró/Ultra odds, Diamante unlocks the leveraged/secondary markets.
 */
export const CATEGORIAS: CategoriaDef[] = [
  { key: 'safes', label: 'Odds Safes', tierLabel: 'Básico', minRank: 0 },
  { key: 'pro', label: 'Odds Pró', tierLabel: 'Pró', minRank: 1 },
  { key: 'ultra', label: 'Odds Ultra', tierLabel: 'Ultra', minRank: 1 },
  { key: 'alavancagem', label: 'Alavancagem', tierLabel: 'Ultra', minRank: 2 },
  { key: 'multiplas', label: 'Múltiplas', tierLabel: 'Ultra', minRank: 2 },
  { key: 'secundario', label: 'Merc. Secundário', tierLabel: 'Ultra', minRank: 2 },
  { key: 'ligas', label: 'Ligas Americanas', tierLabel: 'Ultra', minRank: 2 },
];

export function categoriaDef(key: BilheteCategoria): CategoriaDef {
  const def = CATEGORIAS.find((c) => c.key === key);
  // The enum and the catalog are kept in lockstep; this only fires on a
  // schema/catalog drift, which should fail loudly.
  if (!def) throw new Error(`BilheteCategoria without catalog entry: ${key}`);
  return def;
}
