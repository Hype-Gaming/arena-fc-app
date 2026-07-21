export interface ComposerMatch {
  homeTeam: string;
  awayTeam: string;
  competition: string;
}

export interface ComposerEntrada {
  id: string;
  market: string;
  selection: string;
  odd: number;
  justification: string;
}

function fmtOdd(odd: number): string {
  return odd.toFixed(2);
}

/**
 * Assisted-AI response: deterministic template composition.
 * The first entrada is treated as the ENTRADA PRINCIPAL.
 * Future swap to a real LLM keeps this signature.
 */
export function composeAnalysisMessage(
  match: ComposerMatch,
  entradas: ComposerEntrada[],
): string {
  if (entradas.length === 0) {
    throw new Error('No entradas available for this match');
  }

  const [principal, ...rest] = entradas;
  const lines: string[] = [];

  lines.push(
    `Analisei ${match.homeTeam} x ${match.awayTeam} (${match.competition}). Aqui vai minha leitura:`,
  );
  lines.push('');
  lines.push('🎯 ENTRADA PRINCIPAL');
  lines.push(`Mercado: ${principal.market}`);
  lines.push(`Seleção: ${principal.selection}`);
  lines.push(`Odd: ${fmtOdd(principal.odd)}`);
  lines.push(`Justificativa: ${principal.justification}`);

  if (rest.length > 0) {
    lines.push('');
    lines.push('➕ Entradas adicionais:');
    for (const e of rest) {
      lines.push(
        `• ${e.market} — ${e.selection} @ ${fmtOdd(e.odd)}: ${e.justification}`,
      );
    }
  }

  lines.push('');
  lines.push('Boa sorte! 🍀');

  return lines.join('\n');
}

/**
 * Structured analysis in the 4-section format the frontend parses into cards:
 * ENTRADA PRINCIPAL, ALTERNATIVAS, RESUMO, CONTEXTO. Deterministic — used by the
 * mock provider (dev/tests). The DeepSeek prompt asks the model for the same
 * shape, so both render identically. Headers must stay EXACTLY as below; the
 * frontend parser keys off them.
 */
export function composeStructuredAnalysis(
  match: ComposerMatch,
  entradas: ComposerEntrada[],
): string {
  if (entradas.length === 0) {
    throw new Error('No entradas available for this match');
  }

  const [principal, ...rest] = entradas;
  const lines: string[] = [];

  lines.push('🎯 ENTRADA PRINCIPAL');
  lines.push(`${principal.selection}`);
  lines.push(
    `${principal.market} @ ${fmtOdd(principal.odd)}. ${principal.justification}`,
  );
  lines.push('');

  lines.push('⚡ ALTERNATIVAS');
  if (rest.length > 0) {
    for (const e of rest) {
      lines.push(
        `${e.selection} — ${e.market} @ ${fmtOdd(e.odd)}: ${e.justification}`,
      );
    }
  } else {
    lines.push(
      'Sem alternativa clara neste jogo — a entrada principal concentra o melhor valor.',
    );
  }
  lines.push('');

  lines.push('📋 RESUMO');
  lines.push(
    `${match.homeTeam} x ${match.awayTeam} (${match.competition}): a leitura aponta ${principal.selection} como o caminho mais provável, na odd ${fmtOdd(principal.odd)}.`,
  );
  lines.push('');

  lines.push('🔍 CONTEXTO');
  lines.push(`- ${principal.justification}`);
  for (const e of rest) {
    lines.push(`- ${e.market}: ${e.justification}`);
  }
  lines.push('- Nenhuma análise é garantia de resultado.');

  return lines.join('\n');
}
