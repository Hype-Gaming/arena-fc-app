import { settleBilhete } from './settle';

const teams = { homeTeam: 'Botafogo', awayTeam: 'Flamengo' };

describe('settleBilhete — 1x2', () => {
  const base = { mercado: '1x2', linha: null, ...teams };

  it('greens a home pick when the home team wins', () => {
    expect(settleBilhete({ home: 2, away: 1 }, { ...base, selecao: 'Botafogo' })).toBe('green');
  });
  it('reds a home pick when the home team does not win', () => {
    expect(settleBilhete({ home: 1, away: 1 }, { ...base, selecao: 'Botafogo' })).toBe('red');
  });
  it('greens an away pick when the away team wins', () => {
    expect(settleBilhete({ home: 0, away: 2 }, { ...base, selecao: 'Flamengo' })).toBe('green');
  });
  it('greens a draw pick on a draw', () => {
    expect(settleBilhete({ home: 1, away: 1 }, { ...base, selecao: 'Empate' })).toBe('green');
  });
  it('reds a draw pick when not a draw', () => {
    expect(settleBilhete({ home: 2, away: 0 }, { ...base, selecao: 'Empate' })).toBe('red');
  });
});

describe('settleBilhete — over/under (total de gols)', () => {
  const base = { mercado: 'over_under', ...teams };

  it('greens "Mais de 2.5" when there are 3+ goals', () => {
    expect(settleBilhete({ home: 2, away: 1 }, { ...base, selecao: 'Mais de 2.5', linha: 2.5 })).toBe('green');
  });
  it('reds "Mais de 2.5" when there are 2 goals', () => {
    expect(settleBilhete({ home: 1, away: 1 }, { ...base, selecao: 'Mais de 2.5', linha: 2.5 })).toBe('red');
  });
  it('greens "Menos de 2.5" when there are 2 goals', () => {
    expect(settleBilhete({ home: 1, away: 1 }, { ...base, selecao: 'Menos de 2.5', linha: 2.5 })).toBe('green');
  });
  it('reads the line from the label when linha is null', () => {
    expect(settleBilhete({ home: 3, away: 0 }, { ...base, selecao: 'Mais de 2.5', linha: null })).toBe('green');
  });
  it('returns null (push) on an exact whole-number line', () => {
    expect(settleBilhete({ home: 2, away: 0 }, { ...base, selecao: 'Mais de 2', linha: 2 })).toBeNull();
  });
});

describe('settleBilhete — ambas marcam (btts)', () => {
  const base = { mercado: 'btts', linha: null, ...teams };

  it('greens "Sim" when both teams score', () => {
    expect(settleBilhete({ home: 1, away: 2 }, { ...base, selecao: 'Sim' })).toBe('green');
  });
  it('reds "Sim" when one side is nil', () => {
    expect(settleBilhete({ home: 3, away: 0 }, { ...base, selecao: 'Sim' })).toBe('red');
  });
  it('greens "Não" when one side is nil', () => {
    expect(settleBilhete({ home: 3, away: 0 }, { ...base, selecao: 'Não' })).toBe('green');
  });
});

describe('settleBilhete — chance dupla (double chance)', () => {
  const base = { mercado: 'double_chance', linha: null, ...teams };

  it('greens "Casa ou Empate" on a draw', () => {
    expect(settleBilhete({ home: 1, away: 1 }, { ...base, selecao: 'Casa ou Empate' })).toBe('green');
  });
  it('reds "Casa ou Empate" when the away side wins', () => {
    expect(settleBilhete({ home: 0, away: 1 }, { ...base, selecao: 'Casa ou Empate' })).toBe('red');
  });
  it('greens "Casa ou Fora" on any non-draw', () => {
    expect(settleBilhete({ home: 0, away: 1 }, { ...base, selecao: 'Casa ou Fora' })).toBe('green');
  });
});

describe('settleBilhete — empate anula aposta (DNB)', () => {
  const base = { mercado: 'dnb', linha: null, ...teams };

  it('greens the home pick when the home team wins', () => {
    expect(settleBilhete({ home: 2, away: 0 }, { ...base, selecao: 'Botafogo' })).toBe('green');
  });
  it('reds the home pick when the away team wins', () => {
    expect(settleBilhete({ home: 0, away: 2 }, { ...base, selecao: 'Botafogo' })).toBe('red');
  });
  it('returns null (stake refunded) on a draw', () => {
    expect(settleBilhete({ home: 1, away: 1 }, { ...base, selecao: 'Botafogo' })).toBeNull();
  });
});

describe('settleBilhete — ungradeable', () => {
  it('returns null for an unknown market', () => {
    expect(
      settleBilhete({ home: 1, away: 0 }, { mercado: 'placar_exato', selecao: '1:0', linha: null, ...teams }),
    ).toBeNull();
  });
  it('returns null when the market or selection is missing', () => {
    expect(settleBilhete({ home: 1, away: 0 }, { mercado: null, selecao: null, linha: null, ...teams })).toBeNull();
  });
});
