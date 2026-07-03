import { PrismaClient, BilheteCategoria, BilheteResultado } from '@prisma/client';

/**
 * Example bilhetes so a fresh database shows a populated sport page (crest +
 * name in every market) instead of the frontend's demo fallback.
 *
 * Crests are rendered as a coloured badge with the team initials — we do NOT
 * embed third-party logo images (homeLogo/awayLogo stay null). `homeColor` /
 * `awayColor` drive that badge. Categories follow the real gating: `safes` is
 * free, `pro`/`ultra` need Premium, the rest need Diamante — seeding all of
 * them gives every chip a count (locked teasers included).
 *
 * Ids are deterministic (`seed-*`) so this is idempotent: re-running updates
 * the same rows instead of piling up duplicates. `startsAt` is relative to the
 * seed run so the countdown stays in the future.
 */
interface BilheteSeed {
  id: string;
  categoria: BilheteCategoria;
  titulo: string;
  home: [name: string, color: string];
  away: [name: string, color: string];
  competition: string;
  /** hours from the seed run until kickoff (negative = already played) */
  inHours: number;
  odd: number;
  resultado?: BilheteResultado;
}

const BILHETE_SEEDS: BilheteSeed[] = [
  // ── Odds Safes (free) ───────────────────────────────────────────────
  { id: 'seed-safes-1', categoria: 'safes', titulo: 'Vitória mandante', home: ['Espanha', '#c60b1e'], away: ['Áustria', '#ed2939'], competition: 'Eurocopa', inHours: 2.2, odd: 1.53 },
  { id: 'seed-safes-2', categoria: 'safes', titulo: 'Dupla chance', home: ['Portugal', '#006600'], away: ['Croácia', '#ff2400'], competition: 'Eurocopa', inHours: 6.2, odd: 1.57 },
  { id: 'seed-safes-3', categoria: 'safes', titulo: 'Ambas marcam', home: ['Cuiabá', '#f5c518'], away: ['América-MG', '#0b7a3b'], competition: 'Brasileirão', inHours: 8.4, odd: 1.47 },
  { id: 'seed-safes-4', categoria: 'safes', titulo: 'Over 1.5 gols', home: ['Estados Unidos', '#3c3b6e'], away: ['Bósnia', '#002395'], competition: 'Amistoso', inHours: 9.5, odd: 1.62 },
  // a couple of settled greens for the "Últimos Greens" hub card
  { id: 'seed-safes-g1', categoria: 'safes', titulo: 'Vitória mandante', home: ['Real Madrid', '#febe10'], away: ['Getafe', '#005999'], competition: 'La Liga', inHours: -20, odd: 1.44, resultado: 'green' },
  { id: 'seed-safes-g2', categoria: 'safes', titulo: 'Over 2.5 gols', home: ['Bayern', '#dc052d'], away: ['Werder', '#1d9053'], competition: 'Bundesliga', inHours: -28, odd: 1.66, resultado: 'green' },

  // ── Odds Pró (Premium) ──────────────────────────────────────────────
  { id: 'seed-pro-1', categoria: 'pro', titulo: 'Vitória mandante', home: ['Suíça', '#d52b1e'], away: ['Argélia', '#006233'], competition: 'Amistoso', inHours: 12.1, odd: 2.10 },
  { id: 'seed-pro-2', categoria: 'pro', titulo: 'Handicap asiático', home: ['Austrália', '#012169'], away: ['Egito', '#ce1126'], competition: 'Amistoso', inHours: 26.4, odd: 2.35 },
  { id: 'seed-pro-3', categoria: 'pro', titulo: 'Placar exato', home: ['Flamengo', '#e63946'], away: ['Palmeiras', '#1b998b'], competition: 'Brasileirão', inHours: 29.0, odd: 1.95 },

  // ── Odds Ultra (Premium) ────────────────────────────────────────────
  { id: 'seed-ultra-1', categoria: 'ultra', titulo: 'Vitória visitante', home: ['Inglaterra', '#cf081f'], away: ['RD Congo', '#007fff'], competition: 'Amistoso', inHours: 30.2, odd: 3.40 },
  { id: 'seed-ultra-2', categoria: 'ultra', titulo: 'Empate', home: ['França', '#0055a4'], away: ['Marrocos', '#c1272d'], competition: 'Amistoso', inHours: 50.7, odd: 3.85 },

  // ── Alavancagem (Diamante) ──────────────────────────────────────────
  { id: 'seed-alav-1', categoria: 'alavancagem', titulo: 'Alavancagem do dia', home: ['Barcelona', '#a50044'], away: ['Atlético de Madrid', '#cb3524'], competition: 'La Liga', inHours: 33.0, odd: 4.50 },

  // ── Múltiplas (Diamante) ────────────────────────────────────────────
  { id: 'seed-mult-1', categoria: 'multiplas', titulo: 'Múltipla tripla', home: ['Bayern', '#dc052d'], away: ['Dortmund', '#fde100'], competition: 'Múltipla Alemã', inHours: 40.0, odd: 6.20 },

  // ── Mercado Secundário (Diamante) ───────────────────────────────────
  { id: 'seed-sec-1', categoria: 'secundario', titulo: 'Escanteios +9.5', home: ['Napoli', '#12a0d7'], away: ['Juventus', '#000000'], competition: 'Serie A', inHours: 45.0, odd: 1.80 },
  { id: 'seed-sec-2', categoria: 'secundario', titulo: 'Cartões +4.5', home: ['Milan', '#fb090b'], away: ['Inter', '#0068a8'], competition: 'Serie A', inHours: 48.0, odd: 1.72 },

  // ── Ligas Americanas (Diamante) ─────────────────────────────────────
  { id: 'seed-ligas-1', categoria: 'ligas', titulo: 'Moneyline', home: ['Lakers', '#552583'], away: ['Celtics', '#007a33'], competition: 'NBA', inHours: 20.0, odd: 1.90 },
  { id: 'seed-ligas-2', categoria: 'ligas', titulo: 'Spread', home: ['Chiefs', '#e31837'], away: ['Bills', '#00338d'], competition: 'NFL', inHours: 60.0, odd: 1.85 },
];

/** Idempotently upsert the example bilhetes by their deterministic id. */
export async function seedBilhetes(
  prisma: Pick<PrismaClient, 'bilhete'>,
): Promise<void> {
  const now = Date.now();
  for (const s of BILHETE_SEEDS) {
    const data = {
      titulo: s.titulo,
      categoria: s.categoria,
      homeTeam: s.home[0],
      homeColor: s.home[1],
      awayTeam: s.away[0],
      awayColor: s.away[1],
      homeLogo: null,
      awayLogo: null,
      competition: s.competition,
      startsAt: new Date(now + s.inHours * 3_600_000),
      odd: s.odd,
      resultado: s.resultado ?? 'pending',
      publishedAt: new Date(),
    };
    await prisma.bilhete.upsert({
      where: { id: s.id },
      create: { id: s.id, ...data },
      update: data,
    });
  }
}
