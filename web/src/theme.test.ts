// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  fileURLToPath(new URL('./theme.css', import.meta.url)),
  'utf-8',
);

describe('theme.css design tokens', () => {
  it('defines the dark/gold/green palette as CSS variables', () => {
    expect(css).toContain('--color-bg: #0a0e1a');
    expect(css).toContain('--color-surface: #131a2b');
    expect(css).toContain('--color-gold: #d4af37');
    expect(css).toContain('--color-green: #1db954');
    expect(css).toContain('--radius-card: 16px');
  });
});
