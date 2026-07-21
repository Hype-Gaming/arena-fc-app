// web/src/features/tipster/analysis-format.ts
// Parses the IA Tipster analysis message into the 4 sections the UI renders as
// cards. The backend (mock + DeepSeek prompt) emits fixed headers; if they're
// absent (an off-format reply), parseAnalysis returns null and the caller falls
// back to plain text.

export type SectionKey = 'principal' | 'alternativas' | 'resumo' | 'contexto';

export interface AnalysisSection {
  key: SectionKey;
  label: string;
  /** The pick line, for ENTRADA PRINCIPAL / ALTERNATIVAS (bold in the card). */
  headline?: string;
  paragraphs: string[];
  bullets: string[];
}

const LABELS: Record<SectionKey, string> = {
  principal: 'Entrada Principal',
  alternativas: 'Alternativas',
  resumo: 'Resumo',
  contexto: 'Contexto',
};

// A header line equals one of these after stripping emoji/punctuation — exact
// match keeps body text that merely mentions "resumo" from being taken as one.
const HEADER_TO_KEY: Record<string, SectionKey> = {
  'entrada principal': 'principal',
  alternativas: 'alternativas',
  resumo: 'resumo',
  contexto: 'contexto',
};

function headerKey(line: string): SectionKey | null {
  const stripped = line
    .replace(/[^\p{L}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return HEADER_TO_KEY[stripped] ?? null;
}

export function parseAnalysis(message: string): AnalysisSection[] | null {
  const sections: AnalysisSection[] = [];
  let current: AnalysisSection | null = null;

  for (const raw of message.split('\n')) {
    const line = raw.trim();
    const key = headerKey(line);
    if (key) {
      current = { key, label: LABELS[key], paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }
    if (!current || !line) continue;

    const bullet = line.replace(/^[-•*]\s+/, '');
    if (bullet !== line) {
      current.bullets.push(bullet);
      continue;
    }
    // First plain line of a pick section is its headline.
    const isPick = current.key === 'principal' || current.key === 'alternativas';
    if (
      isPick &&
      current.headline == null &&
      current.paragraphs.length === 0 &&
      current.bullets.length === 0
    ) {
      current.headline = line;
    } else {
      current.paragraphs.push(line);
    }
  }

  // Only structured if the anchor section is present.
  return sections.some((s) => s.key === 'principal') ? sections : null;
}
