import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AnalyzeDto } from './analyze.dto';
import { MatchSearchQueryDto } from './match-search-query.dto';

describe('AnalyzeDto', () => {
  it('rejects a missing matchId', async () => {
    const dto = plainToInstance(AnalyzeDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('matchId');
  });

  it('accepts a non-empty matchId', async () => {
    const dto = plainToInstance(AnalyzeDto, { matchId: 'm1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('MatchSearchQueryDto', () => {
  it('rejects an empty query', async () => {
    const dto = plainToInstance(MatchSearchQueryDto, { q: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a valid query and leaves it trimmed-as-is for the service', async () => {
    const dto = plainToInstance(MatchSearchQueryDto, { q: 'sao paulo' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.q).toBe('sao paulo');
  });
});
