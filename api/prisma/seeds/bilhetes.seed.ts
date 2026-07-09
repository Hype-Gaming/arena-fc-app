import { PrismaClient, BilheteCategoria, BilheteResultado } from '@prisma/client';

/**
 * Seed only the "Últimos Greens" track record (a couple of settled winners) so
 * a fresh database has history to show. The *pending* sport-page bilhetes are no
 * longer fictional matchups — they're generated from the live Altenar/Esportiva
 * feed by `scripts/generate-bilhetes-from-feed.js` (real teams, odds, crests and
 * deep links, refreshable), so we don't bake stale fixtures here that would
 * reappear on every reboot.
 *
 * Each team carries an optional API-Football team id: when present the card
 * shows the real cached crest (served via /api/team-logos/<id>.png); else it
 * falls back to a coloured initials badge driven by `color`.
 *
 * Ids are deterministic (`seed-*`) so this is idempotent: re-running updates the
 * same rows instead of piling up duplicates. `startsAt` is relative to the seed
 * run so the "played N hours ago" stays sensible.
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
  // A couple of settled greens so the "Últimos Greens" hub card and history
  // screen have a track record on a fresh database. Pending sport-page tickets
  // come from the feed generator, not from here.
  { id: 'seed-safes-g1', categoria: 'safes', titulo: 'Vitória mandante', home: ['Real Madrid', '#febe10', 541], away: ['Getafe', '#005999', 546], competition: 'La Liga', inHours: -20, odd: 1.44, resultado: 'green' },
  { id: 'seed-safes-g2', categoria: 'safes', titulo: 'Over 2.5 gols', home: ['Bayern', '#dc052d', 157], away: ['Werder', '#1d9053', 162], competition: 'Bundesliga', inHours: -28, odd: 1.66, resultado: 'green' },
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
