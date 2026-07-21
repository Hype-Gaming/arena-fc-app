import { describe, it, expect } from 'vitest';
import { parseAnalysis } from './analysis-format';

const MSG = [
  '🎯 ENTRADA PRINCIPAL',
  'Slovan Bratislava vence',
  'Resultado Final @ 2.22. Visitante em sequência vitoriosa.',
  '',
  '⚡ ALTERNATIVAS',
  'Slovan BTTS — Não @ 1.80: defesa compacta.',
  '',
  '📋 RESUMO',
  'Slovan é favorito real: chega em sequência de 2 vitórias.',
  '',
  '🔍 CONTEXTO',
  '- Sem H2H recente entre os times',
  '- Nenhuma análise é garantia de resultado.',
].join('\n');

describe('parseAnalysis', () => {
  it('splits the message into the four sections', () => {
    const sections = parseAnalysis(MSG);
    expect(sections).not.toBeNull();
    expect(sections!.map((s) => s.key)).toEqual([
      'principal',
      'alternativas',
      'resumo',
      'contexto',
    ]);
  });

  it('extracts the headline of the pick sections', () => {
    const sections = parseAnalysis(MSG)!;
    const principal = sections.find((s) => s.key === 'principal')!;
    expect(principal.headline).toBe('Slovan Bratislava vence');
    expect(principal.paragraphs[0]).toContain('Resultado Final @ 2.22');
  });

  it('collects bullets for CONTEXTO', () => {
    const contexto = parseAnalysis(MSG)!.find((s) => s.key === 'contexto')!;
    expect(contexto.bullets).toHaveLength(2);
    expect(contexto.bullets[0]).toBe('Sem H2H recente entre os times');
  });

  it('returns null for an off-format (plain text) message', () => {
    expect(parseAnalysis('Não achei esse jogo, tente outro nome.')).toBeNull();
  });

  it('does not treat a body line mentioning "resumo" as a header', () => {
    const sections = parseAnalysis(MSG)!;
    // "Resultado Final" starts with "Resu" but must not be parsed as RESUMO.
    expect(sections.filter((s) => s.key === 'resumo')).toHaveLength(1);
  });
});
