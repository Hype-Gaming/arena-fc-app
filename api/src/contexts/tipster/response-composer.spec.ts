import { composeAnalysisMessage, ComposerMatch, ComposerEntrada } from './response-composer';

const match: ComposerMatch = {
  homeTeam: 'São Paulo',
  awayTeam: 'Palmeiras',
  competition: 'Brasileirão',
};

const principal: ComposerEntrada = {
  id: 'e1',
  market: 'Resultado Final',
  selection: 'São Paulo vence',
  odd: 2.15,
  justification: 'Mandante invicto há 8 jogos em casa.',
};

describe('composeAnalysisMessage', () => {
  it('builds a conversational message naming the match and the ENTRADA PRINCIPAL', () => {
    const text = composeAnalysisMessage(match, [principal]);
    expect(text).toContain('São Paulo x Palmeiras');
    expect(text).toContain('ENTRADA PRINCIPAL');
    expect(text).toContain('Resultado Final');
    expect(text).toContain('São Paulo vence');
    expect(text).toContain('2.15');
    expect(text).toContain('Mandante invicto há 8 jogos em casa.');
  });

  it('uses the first entrada as the ENTRADA PRINCIPAL when several exist', () => {
    const second: ComposerEntrada = {
      id: 'e2',
      market: 'Ambas Marcam',
      selection: 'Sim',
      odd: 1.8,
      justification: 'Defesas frágeis.',
    };
    const text = composeAnalysisMessage(match, [principal, second]);
    const principalIndex = text.indexOf('São Paulo vence');
    const secondIndex = text.indexOf('Ambas Marcam');
    expect(principalIndex).toBeGreaterThan(-1);
    expect(principalIndex).toBeLessThan(secondIndex);
  });

  it('throws when there are no entradas to present', () => {
    expect(() => composeAnalysisMessage(match, [])).toThrow(
      'No entradas available for this match',
    );
  });
});
