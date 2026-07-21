// api/src/modules/tipster/ai/deepseek.provider.ts
import { BadGatewayException, Injectable } from '@nestjs/common';
import { AiAnalysisProvider, AnalysisInput } from './ai-analysis.types';

/** DeepSeek chat-completions response (OpenAI-compatible subset). */
interface ChatCompletion {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

const SYSTEM_PROMPT = [
  'Você é o "IA Tipster", um analista de apostas de futebol objetivo e honesto.',
  'Recebe uma partida e uma lista de mercados JÁ disponíveis (com odds reais).',
  'O PRIMEIRO mercado da lista é a ENTRADA PRINCIPAL. Nunca invente odds,',
  'mercados ou números fora dos fornecidos. Português do Brasil, tom direto,',
  'sem enrolação.',
  '',
  'Responda SEMPRE exatamente neste formato, com estas 4 seções, nesta ordem,',
  'cada uma começando pelo cabeçalho EXATO (com o emoji):',
  '',
  '🎯 ENTRADA PRINCIPAL',
  '<primeira linha: a recomendação em poucas palavras (a seleção)>',
  '<segunda linha: o mercado + odd e a justificativa em 1-2 frases>',
  '',
  '⚡ ALTERNATIVAS',
  '<até 2 alternativas entre os mercados dados, uma por linha, com justificativa curta>',
  '',
  '📋 RESUMO',
  '<1 a 3 frases resumindo a leitura do jogo>',
  '',
  '🔍 CONTEXTO',
  '- <fato relevante 1>',
  '- <fato relevante 2>',
  '- Nenhuma análise é garantia de resultado.',
].join('\n');

/**
 * Real LLM analysis via DeepSeek (OpenAI-compatible API). Config via env:
 * DEEPSEEK_API_KEY (required to bind this provider), DEEPSEEK_MODEL
 * (default deepseek-chat), DEEPSEEK_BASE_URL (default https://api.deepseek.com).
 */
@Injectable()
export class DeepSeekAnalysisProvider implements AiAnalysisProvider {
  readonly name = 'deepseek';

  private baseUrl(): string {
    return process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
  }
  private model(): string {
    return process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';
  }

  async analyze(input: AnalysisInput): Promise<string> {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) {
      // The module only binds this provider when the key exists; this guards a
      // misconfiguration rather than a normal path.
      throw new BadGatewayException('DEEPSEEK_API_KEY is not configured');
    }

    let body: ChatCompletion;
    try {
      const res = await fetch(`${this.baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: this.model(),
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(input) },
          ],
          temperature: 0.4,
          max_tokens: 600,
          stream: false,
        }),
      });
      body = (await res.json()) as ChatCompletion;
      if (!res.ok) {
        throw new BadGatewayException(
          `DeepSeek returned ${res.status}: ${body?.error?.message ?? 'error'}`,
        );
      }
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      throw new BadGatewayException('Could not reach the AI provider');
    }

    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new BadGatewayException('AI provider returned an empty analysis');
    }
    return content;
  }
}

/** Builds the user turn: the fixture plus the vetted markets to choose from. */
export function buildUserPrompt(input: AnalysisInput): string {
  const lines: string[] = [];
  lines.push(`Partida: ${input.homeTeam} x ${input.awayTeam} (${input.competition}).`);
  if (input.live) {
    lines.push(
      `AO VIVO: ${input.live.status}, ${input.live.minute}' — placar ${input.live.homeScore}x${input.live.awayScore}.`,
    );
  }
  lines.push('');
  lines.push('Mercados (não invente outros):');
  input.candidates.forEach((c, i) => {
    const tag = i === 0 ? 'ENTRADA PRINCIPAL' : 'alternativa';
    lines.push(
      `- [${tag}] ${c.market} | ${c.selection} | odd ${c.odd.toFixed(2)} | contexto: ${c.justification}`,
    );
  });
  lines.push('');
  lines.push('Escreva a análise seguindo as regras do sistema.');
  return lines.join('\n');
}
