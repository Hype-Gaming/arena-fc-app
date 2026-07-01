// web/src/screens/BilhetesScreen.tsx
import { useNavigate } from 'react-router-dom';
import './BilhetesScreen.css';

type Tier = 'premium' | 'diamante';
type Result = 'pending' | 'green' | 'red';
type Tipo = 'simples' | 'multipla';

interface Team {
  short: string;
  color: string;
}
interface Leg {
  home: Team;
  away: Team;
  competition: string;
  kickoff: string;
  market: string;
  selection: string;
  odd: number;
  result: Result;
}
interface Bilhete {
  id: string;
  tipo: Tipo;
  tier: Tier;
  result: Result;
  legs: Leg[];
}

const TIER_NAME: Record<Tier, string> = { premium: 'Premium', diamante: 'Diamante' };
const TIER_RANK: Record<'free' | Tier, number> = { free: 0, premium: 1, diamante: 2 };
const RESULT_LABEL: Record<Result, string> = {
  green: 'Verde',
  red: 'Vermelho',
  pending: 'Pendente',
};

const t = (short: string, color: string): Team => ({ short, color });

const MOCK: Bilhete[] = [
  {
    id: 'b1',
    tipo: 'simples',
    tier: 'premium',
    result: 'pending',
    legs: [
      {
        home: t('FLA', '#e63946'),
        away: t('PAL', '#1b998b'),
        competition: 'Brasileirão',
        kickoff: 'Hoje 21:30',
        market: 'Resultado Final',
        selection: 'Casa (Flamengo)',
        odd: 1.85,
        result: 'pending',
      },
    ],
  },
  {
    id: 'b2',
    tipo: 'multipla',
    tier: 'diamante',
    result: 'green',
    legs: [
      {
        home: t('MCI', '#6cabdd'),
        away: t('ARS', '#ef0107'),
        competition: 'Premier League',
        kickoff: 'Sáb 13:30',
        market: 'Ambas Marcam',
        selection: 'Sim',
        odd: 1.72,
        result: 'green',
      },
      {
        home: t('RMA', '#febe10'),
        away: t('BAR', '#a50044'),
        competition: 'La Liga',
        kickoff: 'Sáb 16:00',
        market: 'Total de Gols',
        selection: 'Mais de 2.5',
        odd: 1.9,
        result: 'green',
      },
      {
        home: t('BAY', '#dc052d'),
        away: t('BVB', '#fde100'),
        competition: 'Bundesliga',
        kickoff: 'Sáb 13:30',
        market: 'Dupla Chance',
        selection: '1X (Casa ou Empate)',
        odd: 1.28,
        result: 'green',
      },
    ],
  },
  {
    id: 'b3',
    tipo: 'simples',
    tier: 'premium',
    result: 'green',
    legs: [
      {
        home: t('INT', '#e10600'),
        away: t('GRE', '#0d6cb4'),
        competition: 'Brasileirão',
        kickoff: 'Ontem',
        market: 'Handicap Asiático',
        selection: 'Casa -1',
        odd: 2.1,
        result: 'green',
      },
    ],
  },
  {
    id: 'b4',
    tipo: 'multipla',
    tier: 'premium',
    result: 'red',
    legs: [
      {
        home: t('SAO', '#c8102e'),
        away: t('COR', '#0a0a0a'),
        competition: 'Brasileirão',
        kickoff: 'Ontem',
        market: 'Resultado Final',
        selection: 'Casa (São Paulo)',
        odd: 2.05,
        result: 'green',
      },
      {
        home: t('JUV', '#0a0a0a'),
        away: t('INT', '#0068a8'),
        competition: 'Serie A',
        kickoff: 'Ontem',
        market: 'Total de Gols',
        selection: 'Menos de 2.5',
        odd: 1.8,
        result: 'red',
      },
    ],
  },
];

interface Props {
  /** Plan the viewer is on — decides which tiers are unlocked. Mocked to premium. */
  planKey?: 'free' | Tier;
}

export function BilhetesScreen({ planKey = 'premium' }: Props) {
  const navigate = useNavigate();
  const userRank = TIER_RANK[planKey];

  return (
    <main className="bilhetes">
      <div className="bilhetes__inner">
        <header className="bilhetes__head">
          <h1 className="bilhetes__title">Bilhetes do dia</h1>
          <p className="bilhetes__sub">Montados pelos nossos analistas.</p>
        </header>

        {MOCK.map((b) => {
          const locked = userRank < TIER_RANK[b.tier];
          return (
            <BilheteCard
              key={b.id}
              bilhete={b}
              locked={locked}
              onUpgrade={() => navigate('/planos')}
            />
          );
        })}
      </div>
    </main>
  );
}

function combinedOdd(legs: Leg[]): number {
  return legs.reduce((acc, l) => acc * l.odd, 1);
}

function BilheteCard({
  bilhete,
  locked,
  onUpgrade,
}: {
  bilhete: Bilhete;
  locked: boolean;
  onUpgrade: () => void;
}) {
  const odd = combinedOdd(bilhete.legs);
  return (
    <article
      className="blt"
      data-tier={bilhete.tier}
      data-result={bilhete.result}
      data-locked={locked ? 'true' : undefined}
    >
      <div className="blt__top">
        <span className="blt__tipo">
          {bilhete.tipo === 'multipla'
            ? `Múltipla · ${bilhete.legs.length} seleções`
            : 'Simples'}
        </span>
        <span className="blt__tier">{TIER_NAME[bilhete.tier]}</span>
        <span className="blt__status" data-result={bilhete.result}>
          {RESULT_LABEL[bilhete.result]}
        </span>
      </div>

      <div className="blt__legs">
        {bilhete.legs.map((leg, i) => (
          <div className="leg" key={i} data-result={leg.result}>
            <div className="leg__match">
              <Crest team={leg.home} />
              <span className="leg__vs">×</span>
              <Crest team={leg.away} />
              <span className="leg__names">
                {leg.home.short} <i>x</i> {leg.away.short}
              </span>
              <span className="leg__meta">
                {leg.competition} · {leg.kickoff}
              </span>
            </div>
            <div className="leg__pick">
              <div className="leg__pickmain">
                <span className="leg__market">{leg.market}</span>
                <span className="leg__sel">{leg.selection}</span>
              </div>
              <span className="leg__odd">{leg.odd.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="blt__foot">
        <span className="blt__combined-label">Odd total</span>
        <span className="blt__combined">{odd.toFixed(2)}</span>
      </div>

      {locked && (
        <div className="blt__lock">
          <div className="blt__lock-inner">
            <LockIcon />
            <p>
              Disponível no plano <b>{TIER_NAME[bilhete.tier]}</b>
            </p>
            <button type="button" className="blt__upgrade" onClick={onUpgrade}>
              Fazer upgrade
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Crest({ team }: { team: Team }) {
  return (
    <span className="crest" style={{ ['--crest' as string]: team.color }} aria-hidden="true">
      {team.short.slice(0, 3)}
    </span>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
