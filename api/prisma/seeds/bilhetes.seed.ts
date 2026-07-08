import { PrismaClient, BilheteCategoria, BilheteResultado } from '@prisma/client';

/**
 * Example bilhetes so a fresh database shows a populated sport page (crest +
 * name in every market) instead of the frontend's demo fallback.
 *
 * Each team carries an optional API-Football team id: when present the card
 * shows the real cached crest (served via /api/team-logos/<id>.png); when
 * absent (e.g. NBA/NFL sides, or nations we don't have) it falls back to a
 * coloured initials badge driven by `color`. The ids below were resolved from
 * the team catalog and verified by name, so a reseed keeps the right crests.
 *
 * Categories follow the real gating: `safes` is free, `pro`/`ultra` need
 * Premium, the rest need Diamante — seeding all of them gives every chip a
 * count (locked teasers included).
 *
 * Ids are deterministic (`seed-*`) so this is idempotent: re-running updates
 * the same rows instead of piling up duplicates. `startsAt` is relative to the
 * seed run so the countdown stays in the future.
 */
type Team = [name: string, color: string, logoId?: number];

interface BilheteSeed {
  id: string;
  categoria: BilheteCategoria;
  titulo: string;
  home: Team;
  away: Team;
  competition: string;
  /** hours from the seed run until kickoff (negative = already played) */
  inHours: number;
  odd: number;
  resultado?: BilheteResultado;
}

const BILHETE_SEEDS: BilheteSeed[] = [
  // ── Odds Safes (free) ───────────────────────────────────────────────
  { id: 'seed-safes-1', categoria: 'safes', titulo: 'Vitória mandante', home: ['Espanha', '#c60b1e', 9], away: ['Áustria', '#ed2939', 775], competition: 'Eurocopa', inHours: 2.2, odd: 1.53 },
  { id: 'seed-safes-2', categoria: 'safes', titulo: 'Dupla chance', home: ['Portugal', '#006600', 27], away: ['Croácia', '#ff2400', 3], competition: 'Eurocopa', inHours: 6.2, odd: 1.57 },
  { id: 'seed-safes-3', categoria: 'safes', titulo: 'Ambas marcam', home: ['Cuiabá', '#f5c518', 1193], away: ['América-MG', '#0b7a3b', 125], competition: 'Brasileirão', inHours: 8.4, odd: 1.47 },
  { id: 'seed-safes-4', categoria: 'safes', titulo: 'Over 1.5 gols', home: ['Estados Unidos', '#3c3b6e', 2384], away: ['Bósnia', '#002395'], competition: 'Amistoso', inHours: 9.5, odd: 1.62 },
  // a couple of settled greens for the "Últimos Greens" hub card
  { id: 'seed-safes-g1', categoria: 'safes', titulo: 'Vitória mandante', home: ['Real Madrid', '#febe10', 541], away: ['Getafe', '#005999', 546], competition: 'La Liga', inHours: -20, odd: 1.44, resultado: 'green' },
  { id: 'seed-safes-g2', categoria: 'safes', titulo: 'Over 2.5 gols', home: ['Bayern', '#dc052d', 157], away: ['Werder', '#1d9053', 162], competition: 'Bundesliga', inHours: -28, odd: 1.66, resultado: 'green' },

  // ── Odds Pró (Premium) ──────────────────────────────────────────────
  { id: 'seed-pro-1', categoria: 'pro', titulo: 'Vitória mandante', home: ['Suíça', '#d52b1e', 15], away: ['Argélia', '#006233', 1532], competition: 'Amistoso', inHours: 12.1, odd: 2.10 },
  { id: 'seed-pro-2', categoria: 'pro', titulo: 'Handicap asiático', home: ['Austrália', '#012169', 20], away: ['Egito', '#ce1126', 32], competition: 'Amistoso', inHours: 26.4, odd: 2.35 },
  { id: 'seed-pro-3', categoria: 'pro', titulo: 'Placar exato', home: ['Flamengo', '#e63946', 127], away: ['Palmeiras', '#1b998b', 121], competition: 'Brasileirão', inHours: 29.0, odd: 1.95 },

  // ── Odds Ultra (Premium) ────────────────────────────────────────────
  { id: 'seed-ultra-1', categoria: 'ultra', titulo: 'Vitória visitante', home: ['Inglaterra', '#cf081f', 10], away: ['RD Congo', '#007fff'], competition: 'Amistoso', inHours: 30.2, odd: 3.40 },
  { id: 'seed-ultra-2', categoria: 'ultra', titulo: 'Empate', home: ['França', '#0055a4', 2], away: ['Marrocos', '#c1272d', 31], competition: 'Amistoso', inHours: 50.7, odd: 3.85 },

  // ── Alavancagem (Diamante) ──────────────────────────────────────────
  { id: 'seed-alav-1', categoria: 'alavancagem', titulo: 'Alavancagem do dia', home: ['Barcelona', '#a50044', 529], away: ['Atlético de Madrid', '#cb3524', 530], competition: 'La Liga', inHours: 33.0, odd: 4.50 },

  // ── Múltiplas (Diamante) ────────────────────────────────────────────
  { id: 'seed-mult-1', categoria: 'multiplas', titulo: 'Múltipla tripla', home: ['Bayern', '#dc052d', 157], away: ['Dortmund', '#fde100', 165], competition: 'Múltipla Alemã', inHours: 40.0, odd: 6.20 },

  // ── Mercado Secundário (Diamante) ───────────────────────────────────
  { id: 'seed-sec-1', categoria: 'secundario', titulo: 'Escanteios +9.5', home: ['Napoli', '#12a0d7', 492], away: ['Juventus', '#000000', 496], competition: 'Serie A', inHours: 45.0, odd: 1.80 },
  { id: 'seed-sec-2', categoria: 'secundario', titulo: 'Cartões +4.5', home: ['Milan', '#fb090b', 489], away: ['Inter', '#0068a8', 505], competition: 'Serie A', inHours: 48.0, odd: 1.72 },

  // ── Ligas Americanas (Diamante) — NBA/NFL, no soccer crest → initials ─
  { id: 'seed-ligas-1', categoria: 'ligas', titulo: 'Moneyline', home: ['Lakers', '#552583'], away: ['Celtics', '#007a33'], competition: 'NBA', inHours: 20.0, odd: 1.90 },
  { id: 'seed-ligas-2', categoria: 'ligas', titulo: 'Spread', home: ['Chiefs', '#e31837'], away: ['Bills', '#00338d'], competition: 'NFL', inHours: 60.0, odd: 1.85 },
];

/** Idempotently upsert the example bilhetes by their deterministic id. */
export async function seedBilhetes(
  prisma: Pick<PrismaClient, 'bilhete'>,
): Promise<void> {
  const now = Date.now();
  const logo = (id?: number): string | null =>
    id ? `/api/team-logos/${id}.png` : null;
  for (const s of BILHETE_SEEDS) {
    const data = {
      titulo: s.titulo,
      categoria: s.categoria,
      homeTeam: s.home[0],
      homeColor: s.home[1],
      homeLogo: logo(s.home[2]),
      awayTeam: s.away[0],
      awayColor: s.away[1],
      awayLogo: logo(s.away[2]),
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
