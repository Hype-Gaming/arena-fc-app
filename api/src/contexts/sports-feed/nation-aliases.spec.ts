import { nationEnglishName } from './nation-aliases';

describe('nationEnglishName', () => {
  it('translates accented Portuguese nation names to API-Football English', () => {
    expect(nationEnglishName('Suíça')).toBe('Switzerland');
    expect(nationEnglishName('Colômbia')).toBe('Colombia');
    expect(nationEnglishName('Alemanha')).toBe('Germany');
    expect(nationEnglishName('Inglaterra')).toBe('England');
  });

  it('handles multi-word nations', () => {
    expect(nationEnglishName('Coreia do Sul')).toBe('South Korea');
    expect(nationEnglishName('Estados Unidos')).toBe('USA');
    expect(nationEnglishName('Costa do Marfim')).toBe('Ivory Coast');
  });

  it('is case/spacing insensitive', () => {
    expect(nationEnglishName('  suíça ')).toBe('Switzerland');
    expect(nationEnglishName('PAÍSES BAIXOS')).toBe('Netherlands');
  });

  it('returns null for clubs and unknown names', () => {
    expect(nationEnglishName('Botafogo')).toBeNull();
    expect(nationEnglishName('Real Madrid')).toBeNull();
    expect(nationEnglishName('')).toBeNull();
    expect(nationEnglishName(null)).toBeNull();
  });
});
