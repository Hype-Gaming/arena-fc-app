// Pure result engine: grade a bilhete against a final score. Returns 'green' /
// 'red', or null when it can't be graded automatically (unknown market, a push,
// or a missing/unparseable selection) — those stay pending for the admin.
//
// Selection labels are taken verbatim from the feed (Portuguese), e.g. the home
// team name / "Empate" / away team name for 1x2, "Mais de 2.5" / "Menos de 2.5"
// for totals, "Sim" / "Não" for BTTS, "Casa ou Empate" for double chance.

export interface MatchScore {
  home: number;
  away: number;
}

export interface SettleInput {
  mercado: string | null;
  selecao: string | null;
  linha: number | null;
  homeTeam: string;
  awayTeam: string;
}

export type SettleOutcome = 'green' | 'red' | null;

type Winner = 'home' | 'draw' | 'away';

function norm(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function winnerOf(score: MatchScore): Winner {
  if (score.home > score.away) return 'home';
  if (score.away > score.home) return 'away';
  return 'draw';
}

const hit = (won: boolean): SettleOutcome => (won ? 'green' : 'red');

export function settleBilhete(score: MatchScore, b: SettleInput): SettleOutcome {
  if (!b.mercado || !b.selecao) return null;
  const sel = norm(b.selecao);
  const home = norm(b.homeTeam);
  const away = norm(b.awayTeam);
  const winner = winnerOf(score);

  switch (b.mercado) {
    case '1x2': {
      const pick = pick1x2(sel, home, away);
      return pick ? hit(pick === winner) : null;
    }

    case 'over_under': {
      const line = b.linha ?? parseLine(b.selecao);
      if (line == null) return null;
      const total = score.home + score.away;
      if (total === line) return null; // push (whole-number line)
      const isOver = /\bmais\b|over|acima/.test(sel);
      const isUnder = /\bmenos\b|under|abaixo/.test(sel);
      if (!isOver && !isUnder) return null;
      return hit(isOver ? total > line : total < line);
    }

    case 'btts': {
      const both = score.home > 0 && score.away > 0;
      if (/\bsim\b|yes/.test(sel)) return hit(both);
      if (/\bnao\b|\bno\b/.test(sel)) return hit(!both);
      return null;
    }

    case 'double_chance': {
      const pair = pickDoubleChance(sel, home, away);
      return pair ? hit(pair.includes(winner)) : null;
    }

    case 'dnb': {
      if (winner === 'draw') return null; // stake refunded
      const pick = pick1x2(sel, home, away);
      if (pick !== 'home' && pick !== 'away') return null;
      return hit(pick === winner);
    }

    default:
      return null;
  }
}

function pick1x2(sel: string, home: string, away: string): Winner | null {
  if (/empat|draw|^x$/.test(sel)) return 'draw';
  if (home && sel.includes(home)) return 'home';
  if (away && sel.includes(away)) return 'away';
  if (/\bcasa\b/.test(sel)) return 'home';
  if (/\bfora\b/.test(sel)) return 'away';
  return null;
}

function pickDoubleChance(
  sel: string,
  home: string,
  away: string,
): Winner[] | null {
  const hasHome = /\bcasa\b/.test(sel) || (!!home && sel.includes(home));
  const hasAway = /\bfora\b/.test(sel) || (!!away && sel.includes(away));
  const hasDraw = /empat/.test(sel);
  if (hasHome && hasDraw) return ['home', 'draw'];
  if (hasAway && hasDraw) return ['away', 'draw'];
  if (hasHome && hasAway) return ['home', 'away'];
  return null;
}

function parseLine(label: string): number | null {
  const m = label.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}
