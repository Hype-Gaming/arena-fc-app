// web/src/screens/PlanosScreen.tsx
import { useEffect, useState } from 'react';
import type { ApiClient } from '../lib/apiClient';
import { checkoutUrlFor } from '../lib/checkout';
import './PlanosScreen.css';

interface MeProfile {
  planKey: string;
}

interface Feature {
  label: string;
  included: boolean;
}

interface Plan {
  key: 'free' | 'premium' | 'diamante';
  name: string;
  /** Big value under the name: a price ("R$ 47") or, for Livre, "Livre". */
  price: string;
  /** Billing period tag under the price ("VIDA" = vitalício), if any. */
  period?: string;
  /** Numeric price used to build the upgrade CTA (0 = free). */
  amount: number;
  features: Feature[];
}

/** Rank determines what a subscriber can open: your plan unlocks all ranks ≤ yours. */
const RANK: Record<Plan['key'], number> = { free: 0, premium: 1, diamante: 2 };

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Livre',
    price: 'Livre',
    amount: 0,
    features: [
      { label: '2 probabilidades por dia', included: true },
      { label: 'Entrega via Telegram', included: true },
      { label: 'Cofres de probabilidades', included: false },
      { label: 'Probabilidades Pro', included: false },
      { label: 'Mercados Secundários', included: false },
      { label: 'Alavancagem', included: false },
      { label: 'Múltiplos / Bingo', included: false },
      { label: 'Ligas Americanas', included: false },
      { label: 'Probabilidades Ultra', included: false },
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    price: 'R$ 47',
    period: 'VIDA',
    amount: 47,
    features: [
      { label: '+20 de probabilidade por dia', included: true },
      { label: 'Entrega pelo aplicativo', included: true },
      { label: 'Cofres de probabilidades', included: true },
      { label: 'Probabilidades Pro', included: true },
      { label: 'Probabilidades Ultra', included: true },
      { label: 'Mercados Secundários', included: false },
      { label: 'Alavancagem', included: false },
      { label: 'Múltiplos / Bingo', included: false },
      { label: 'Ligas Americanas', included: false },
    ],
  },
  {
    key: 'diamante',
    name: 'Diamante',
    price: 'R$ 127',
    period: 'VIDA',
    amount: 127,
    features: [
      { label: '+50 de probabilidade por dia', included: true },
      { label: 'Entrega pelo aplicativo', included: true },
      { label: 'Cofres de probabilidades', included: true },
      { label: 'Probabilidades Pro', included: true },
      { label: 'Mercados Secundários', included: true },
      { label: 'Alavancagem', included: true },
      { label: 'Múltiplos / Bingo', included: true },
      { label: 'Ligas Americanas', included: true },
      { label: 'Probabilidades Ultra', included: true },
    ],
  },
];

interface Props {
  api: Pick<ApiClient, 'get'>;
}

export function PlanosScreen({ api }: Props) {
  const [currentKey, setCurrentKey] = useState<Plan['key']>('free');

  useEffect(() => {
    api
      .get<MeProfile>('/me')
      .then((me) => {
        const key = me.planKey as Plan['key'];
        if (key in RANK) setCurrentKey(key);
      })
      .catch(() => setCurrentKey('free'));
  }, [api]);

  const currentRank = RANK[currentKey];

  return (
    <main className="planos">
      <div className="planos__panel">
        <h1 className="planos__title">Compare os planos</h1>
        <div className="planos__grid">
          {PLANS.map((plan) => {
            const rank = RANK[plan.key];
            const state =
              rank === currentRank ? 'current' : rank > currentRank ? 'upgrade' : 'owned';
            return (
              <PlanCard
                key={plan.key}
                plan={plan}
                state={state}
                onUpgrade={() =>
                  window.open(checkoutUrlFor(plan.key), '_blank')
                }
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function PlanCard({
  plan,
  state,
  onUpgrade,
}: {
  plan: Plan;
  state: 'current' | 'upgrade' | 'owned';
  onUpgrade: () => void;
}) {
  const cta =
    state === 'current'
      ? 'Plano atual'
      : state === 'upgrade'
        ? `Fazer Upgrade ${plan.price}`
        : plan.name;

  return (
    <section
      className="plan"
      data-accent={plan.key}
      data-state={state}
      aria-label={`Plano ${plan.name}`}
    >
      <header className="plan__head">
        <div className="plan__name">{plan.name}</div>
        <div className="plan__price">{plan.price}</div>
        {plan.period && <div className="plan__period">{plan.period}</div>}
      </header>

      <ul className="plan__features">
        {plan.features.map((f) => (
          <li key={f.label} className="plan__feature" data-in={f.included}>
            {f.included ? <Check /> : <Cross />}
            <span>{f.label}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="plan__cta"
        disabled={state !== 'upgrade'}
        onClick={state === 'upgrade' ? onUpgrade : undefined}
      >
        {cta}
      </button>
    </section>
  );
}

function Check() {
  return (
    <svg
      className="plan__ic plan__ic--yes"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12.5l4 4 10-10"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function Cross() {
  return (
    <svg
      className="plan__ic plan__ic--no"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
