# Cesta Esportiva — Bilhete pré-preenchido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin click odds across games to build a "cesta" that auto-generates an Esportiva `?selections=` pre-filled deep-link, saved on the bilhete (simples ou múltipla).

**Architecture:** Carry the Altenar `oddId` through normalization → persist it on `Bilhete`/`BilheteLeg` → generate the affiliate deep-link on the backend (source of truth) via a pure helper → the admin UI accumulates clicked selections in a basket and posts them; the public "Adicionar" button already prefers `esportivaShareUrl`, so no public change is needed.

**Tech Stack:** NestJS + Prisma (Postgres), Jest (api), React + Vite, Vitest + Testing Library (web).

Reference spec: [docs/superpowers/specs/2026-07-23-cesta-esportiva-design.md](../specs/2026-07-23-cesta-esportiva-design.md)

---

## File Structure

**Backend (`api/`)**
- `src/contexts/sports-feed/sports-feed.types.ts` — add `oddId` to `NormalizedSelection` (modify).
- `src/contexts/sports-feed/altenar.normalize.ts` — propagate `oddId` in bulk + details normalizers (modify).
- `src/contexts/sports-feed/altenar.normalize.spec.ts` — update expectations (modify).
- `src/contexts/sports-feed/esportiva-link.ts` — add `buildEsportivaSelectionsUrl` (modify).
- `src/contexts/sports-feed/esportiva-link.spec.ts` — cover the new helper (modify).
- `src/contexts/admin/bilhete-share.ts` — **new**: `validateEsportivaShareUrl` (relaxed) + `buildBilheteShareUrl` (pure).
- `src/contexts/admin/bilhete-share.spec.ts` — **new**: tests for the above.
- `src/contexts/admin/bilhetes.service.ts` — import the new module, generate the link on create (modify).
- `src/contexts/admin/dto/bilhete.dto.ts` — add `oddId` / `eventExternalId` to DTOs (modify).
- `prisma/schema.prisma` — `Bilhete.oddId`, `BilheteLeg.eventExternalId`, `BilheteLeg.oddId` (modify) + migration.

**Frontend (`web/`)**
- `src/features/admin/esportivaBasket.ts` — **new**: pure basket helpers.
- `src/features/admin/esportivaBasket.spec.ts` — **new**: vitest unit tests.
- `src/features/admin/adminApi.ts` — add `oddId` to `SportSelection` + `CreateBilheteInput` (modify).
- `src/features/admin/AdminBilhetes.tsx` — wire the basket UI (modify).

---

## Task 1: Carry `oddId` through feed normalization

**Files:**
- Modify: `api/src/contexts/sports-feed/sports-feed.types.ts:3-11`
- Modify: `api/src/contexts/sports-feed/altenar.normalize.ts:81-88` and `274-284`
- Test: `api/src/contexts/sports-feed/altenar.normalize.spec.ts`

- [ ] **Step 1: Write a failing test asserting `oddId` is carried**

Add this test inside the `describe('normalizeAltenar', …)` block in `altenar.normalize.spec.ts`:

```typescript
it('carries the Altenar oddId onto each selection', () => {
  const [ev] = normalizeAltenar(sample(), link, NOW);
  const winner = ev.markets.find((m) => m.key === '1x2')!;
  expect(winner.selections.map((s) => s.oddId)).toEqual([
    4049572921, 4049572922, 4049572923,
  ]);
  const ou = ev.markets.find((m) => m.key === 'over_under')!;
  expect(ou.selections.map((s) => s.oddId)).toEqual([50, 51]);
});
```

Add this test inside the `describe('normalizeAltenarEventDetails', …)` block:

```typescript
it('carries the oddId from GetEventDetails onto each selection', () => {
  const ou = normalizeAltenarEventDetails(detailsSample()).find(
    (m) => m.key === 'over_under',
  )!;
  expect(ou.selections.map((s) => s.oddId)).toEqual([20, 21, 22, 23]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && npx jest altenar.normalize --silent`
Expected: FAIL — `oddId` is `undefined` (property does not exist on the selection objects).

- [ ] **Step 3: Add `oddId` to the type**

In `sports-feed.types.ts`, replace the `NormalizedSelection` interface (lines 3-11) with:

```typescript
/** One pickable outcome inside a market, with its decimal price. */
export interface NormalizedSelection {
  /** Provider label as bettors see it, e.g. "Mais de 2.5", "Empate", "Sim". */
  label: string;
  /** Decimal price. Suspended legs (price <= 0) are dropped, so this is > 0. */
  odd: number;
  /** Goal/handicap line when the market carries one (Over/Under), else null. */
  line: number | null;
  /** Altenar odd id — the `{oddId}` half of the `?selections=` deep-link pair. */
  oddId: number;
}
```

- [ ] **Step 4: Propagate `oddId` in both normalizers**

In `altenar.normalize.ts`, in `extractMarkets` (the `.map((o) => ({ … }))` around line 84), add `oddId: o.id`:

```typescript
      .map((o) => ({
        label: o.name?.trim() || '—',
        odd: o.price,
        line: key === 'over_under' ? parseLine(o.name ?? '') : null,
        oddId: o.id,
      }));
```

In `normalizeAltenarEventDetails` (the `.map((o) => ({ … }))` around line 284), add `oddId: o.id`:

```typescript
      .map((o) => ({ label: o.name?.trim() || '—', odd: o.price, line, oddId: o.id }));
```

- [ ] **Step 5: Update the existing full-object expectations that now include `oddId`**

The two big `toEqual` assertions and the merged-line assertion break because selections gained a field. Update them:

In `normalizeAltenar` → `'maps a prematch event…'`, replace the `markets` array's selections so each carries its `oddId` (1X2: 4049572921 / 4049572922 / 4049572923; Total: 50 / 51; BTTS: 60 / 61):

```typescript
      markets: [
        {
          typeId: 1,
          key: '1x2',
          name: 'Vencedor do encontro',
          selections: [
            { label: 'Botafogo', odd: 1.9091, line: null, oddId: 4049572921 },
            { label: 'Empate', odd: 3.4, line: null, oddId: 4049572922 },
            { label: 'Santos', odd: 4.1, line: null, oddId: 4049572923 },
          ],
        },
        {
          typeId: 18,
          key: 'over_under',
          name: 'Total de gols',
          selections: [
            { label: 'Mais de 2.5', odd: 1.72, line: 2.5, oddId: 50 },
            { label: 'Menos de 2.5', odd: 2.05, line: 2.5, oddId: 51 },
          ],
        },
        {
          typeId: 29,
          key: 'btts',
          name: 'Ambas marcam',
          selections: [
            { label: 'Sim', odd: 1.8, line: null, oddId: 60 },
            { label: 'Não', odd: 1.95, line: null, oddId: 61 },
          ],
        },
      ],
```

In the same file's `'drops non-core markets…'` test, update the single-selection expectation:

```typescript
    expect(ou.selections).toEqual([{ label: 'Menos de 2.5', odd: 2.05, line: 2.5, oddId: 51 }]);
```

In `normalizeAltenarEventDetails` → `'surfaces the Principal markets…'`, update the merged over_under expectation:

```typescript
    expect(ou.selections).toEqual([
      { label: 'Mais de 1.5', odd: 1.7, line: 1.5, oddId: 20 },
      { label: 'Menos de 1.5', odd: 2.1, line: 1.5, oddId: 21 },
      { label: 'Mais de 2.5', odd: 2.4, line: 2.5, oddId: 22 },
      { label: 'Menos de 2.5', odd: 1.55, line: 2.5, oddId: 23 },
    ]);
```

In `normalizeAltenarLive` → `'maps a live event…'`, update the 1X2 selections (oddIds 1 / 2 / 3):

```typescript
          selections: [
            { label: 'Caac Brasil FC RJ', odd: 1.8, line: null, oddId: 1 },
            { label: 'Empate', odd: 3.2, line: null, oddId: 2 },
            { label: 'Barcelona EC RJ', odd: 4.5, line: null, oddId: 3 },
          ],
```

- [ ] **Step 6: Run the full normalize suite to verify it passes**

Run: `cd api && npx jest altenar.normalize --silent`
Expected: PASS (all tests green).

- [ ] **Step 7: Commit**

```bash
git add api/src/contexts/sports-feed/sports-feed.types.ts api/src/contexts/sports-feed/altenar.normalize.ts api/src/contexts/sports-feed/altenar.normalize.spec.ts
git commit -m "feat(feed): carry Altenar oddId onto normalized selections"
```

---

## Task 2: `buildEsportivaSelectionsUrl` helper

Builds the affiliate deep-link. Base is env-configurable (`ESPORTIVA_SELECTIONS_BASE_URL`, default `https://go.aff.esportiva.bet/nwxez5q1`) so the affiliate swaps without a code deploy. Literal commas are preserved (the verified working format uses raw commas, not `%2C`).

**Files:**
- Modify: `api/src/contexts/sports-feed/esportiva-link.ts`
- Test: `api/src/contexts/sports-feed/esportiva-link.spec.ts`

- [ ] **Step 1: Write failing tests for the helper**

Append to `esportiva-link.spec.ts` (add `buildEsportivaSelectionsUrl` to the existing import from `./esportiva-link`):

```typescript
describe('buildEsportivaSelectionsUrl', () => {
  const OLD = process.env.ESPORTIVA_SELECTIONS_BASE_URL;
  afterEach(() => {
    if (OLD === undefined) delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    else process.env.ESPORTIVA_SELECTIONS_BASE_URL = OLD;
  });

  it('builds a single-leg url with the default affiliate base', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    expect(buildEsportivaSelectionsUrl([{ eventId: '16998999', oddId: 4219529561 }]))
      .toBe('https://go.aff.esportiva.bet/nwxez5q1?selections=16998999-4219529561');
  });

  it('comma-joins multiple legs with literal commas', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    expect(
      buildEsportivaSelectionsUrl([
        { eventId: '16027574', oddId: 4049555380 },
        { eventId: '16998999', oddId: 4219529561 },
      ]),
    ).toBe(
      'https://go.aff.esportiva.bet/nwxez5q1?selections=16027574-4049555380,16998999-4219529561',
    );
  });

  it('honours a custom base and appends with & when it already has a query', () => {
    process.env.ESPORTIVA_SELECTIONS_BASE_URL =
      'https://go.aff.esportiva.bet/abc?utm_campaign=x';
    expect(buildEsportivaSelectionsUrl([{ eventId: '1', oddId: 2 }])).toBe(
      'https://go.aff.esportiva.bet/abc?utm_campaign=x&selections=1-2',
    );
  });

  it('drops invalid pairs and returns null when none remain', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    expect(buildEsportivaSelectionsUrl([])).toBeNull();
    expect(buildEsportivaSelectionsUrl([{ eventId: '', oddId: 5 }])).toBeNull();
    expect(buildEsportivaSelectionsUrl([{ eventId: '1', oddId: 0 }])).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd api && npx jest esportiva-link --silent`
Expected: FAIL — `buildEsportivaSelectionsUrl` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `esportiva-link.ts`:

```typescript
/** Default affiliate base for the pre-filled bet-slip link (env-overridable). */
const SELECTIONS_BASE_DEFAULT = 'https://go.aff.esportiva.bet/nwxez5q1';

/**
 * Build the Esportiva `?selections=` deep-link that opens the bet slip
 * pre-filled. Each pair is `{eventId}-{oddId}`; multiple pairs are comma-joined
 * with LITERAL commas (the verified working format). Returns null when there is
 * no valid pair. The affiliate lives in `ESPORTIVA_SELECTIONS_BASE_URL`.
 */
export function buildEsportivaSelectionsUrl(
  pairs: { eventId: string; oddId: number }[],
): string | null {
  const valid = pairs.filter(
    (p) => !!p.eventId && Number.isFinite(p.oddId) && p.oddId > 0,
  );
  if (valid.length === 0) return null;
  const base =
    process.env.ESPORTIVA_SELECTIONS_BASE_URL?.trim() || SELECTIONS_BASE_DEFAULT;
  const sel = valid.map((p) => `${p.eventId}-${p.oddId}`).join(',');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}selections=${sel}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd api && npx jest esportiva-link --silent`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/src/contexts/sports-feed/esportiva-link.ts api/src/contexts/sports-feed/esportiva-link.spec.ts
git commit -m "feat(feed): add buildEsportivaSelectionsUrl affiliate deep-link helper"
```

---

## Task 3: Persist `oddId` on Bilhete and BilheteLeg

**Files:**
- Modify: `api/prisma/schema.prisma:336-369`

- [ ] **Step 1: Add the columns to the schema**

In `schema.prisma`, in `model Bilhete`, immediately after the `odd  Decimal @db.Decimal(6, 2)` line (line 336), add:

```prisma
  // Altenar odd id of the single selection, when this bilhete was built from a
  // sportsbook pick. Lets the `?selections=` deep-link be (re)generated.
  oddId       Int?
```

In `model BilheteLeg`, after the `odd  Decimal @db.Decimal(6, 2)` line (line 363), add:

```prisma
  // Sportsbook identity of this leg, when built from the feed picker. Both null
  // for legacy/hand-typed legs. Enables generating the múltipla deep-link.
  eventExternalId String?
  oddId           Int?
```

- [ ] **Step 2: Create and apply the migration**

Ensure Postgres is up (docker compose) and `api/.env` has `DATABASE_URL`. Run:

```bash
cd api && npx prisma migrate dev --name add_bilhete_oddid
```

Expected: a new folder `api/prisma/migrations/<timestamp>_add_bilhete_oddid/` is created, the migration applies cleanly, and `prisma generate` runs (Prisma Client now types `oddId` / `eventExternalId`).

- [ ] **Step 3: Verify the client compiles**

Run: `cd api && npx tsc --noEmit`
Expected: no errors (the new fields are recognized).

- [ ] **Step 4: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations
git commit -m "feat(db): store oddId on Bilhete and BilheteLeg for deep-link generation"
```

---

## Task 4: DTOs + relaxed validation + backend link generation

Extract link validation/generation into a pure, testable module and wire it into `create()`. `validateEsportivaShareUrl` is **relaxed** to also accept `go.aff.esportiva.bet/...?selections=` URLs. `buildBilheteShareUrl` turns a create-DTO into the deep-link (múltipla from legs, or single from top-level `eventExternalId`+`oddId`).

**Files:**
- Modify: `api/src/contexts/admin/dto/bilhete.dto.ts:18-51`
- Create: `api/src/contexts/admin/bilhete-share.ts`
- Create: `api/src/contexts/admin/bilhete-share.spec.ts`
- Modify: `api/src/contexts/admin/bilhetes.service.ts:1-38, 253-268`

- [ ] **Step 1: Extend the DTOs**

In `bilhete.dto.ts`, add `IsInt` to the `class-validator` import list, then update `BilheteLegDto`:

```typescript
export class BilheteLegDto {
  @IsString() homeTeam!: string;
  @IsString() awayTeam!: string;
  @IsString() mercado!: string;
  @IsString() selecao!: string;
  @IsOptional() @IsNumber() @IsPositive() linha?: number;
  @IsNumber() @IsPositive() odd!: number;
  @IsOptional() @IsString() eventExternalId?: string;
  @IsOptional() @IsInt() @IsPositive() oddId?: number;
}
```

In `CreateBilheteDto`, after the `odd` field (line 42), add:

```typescript
  @IsOptional() @IsInt() @IsPositive() oddId?: number;
```

- [ ] **Step 2: Write failing tests for the pure module**

Create `api/src/contexts/admin/bilhete-share.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { validateEsportivaShareUrl, buildBilheteShareUrl } from './bilhete-share';

describe('validateEsportivaShareUrl', () => {
  it('accepts a shareCode url on esportiva.bet.br', () => {
    const u = 'https://esportiva.bet.br/sports?shareCode=HC9FF9K16D1';
    expect(validateEsportivaShareUrl(u)).toBe(u);
  });

  it('accepts a selections url on the affiliate host', () => {
    const u = 'https://go.aff.esportiva.bet/nwxez5q1?selections=1-2,3-4';
    expect(validateEsportivaShareUrl(u)).toBe(u);
  });

  it('rejects http and urls with neither shareCode nor selections', () => {
    expect(() => validateEsportivaShareUrl('http://esportiva.bet.br?shareCode=x')).toThrow(
      BadRequestException,
    );
    expect(() => validateEsportivaShareUrl('https://esportiva.bet.br/sports')).toThrow(
      BadRequestException,
    );
    expect(() => validateEsportivaShareUrl('not a url')).toThrow(BadRequestException);
  });
});

describe('buildBilheteShareUrl', () => {
  const OLD = process.env.ESPORTIVA_SELECTIONS_BASE_URL;
  afterEach(() => {
    if (OLD === undefined) delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    else process.env.ESPORTIVA_SELECTIONS_BASE_URL = OLD;
  });

  it('builds a múltipla url when every leg has event + oddId', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    const url = buildBilheteShareUrl({
      legs: [
        { homeTeam: 'A', awayTeam: 'B', mercado: '1x2', selecao: 'A', odd: 1.5, eventExternalId: '16027574', oddId: 4049555380 },
        { homeTeam: 'C', awayTeam: 'D', mercado: '1x2', selecao: 'C', odd: 1.8, eventExternalId: '16998999', oddId: 4219529561 },
      ],
    });
    expect(url).toBe(
      'https://go.aff.esportiva.bet/nwxez5q1?selections=16027574-4049555380,16998999-4219529561',
    );
  });

  it('builds a single url from top-level event + oddId', () => {
    delete process.env.ESPORTIVA_SELECTIONS_BASE_URL;
    expect(
      buildBilheteShareUrl({ eventExternalId: '16998999', oddId: 4219529561 }),
    ).toBe('https://go.aff.esportiva.bet/nwxez5q1?selections=16998999-4219529561');
  });

  it('returns null when a leg is missing its oddId', () => {
    expect(
      buildBilheteShareUrl({
        legs: [{ homeTeam: 'A', awayTeam: 'B', mercado: '1x2', selecao: 'A', odd: 1.5 }],
      }),
    ).toBeNull();
  });

  it('returns null when there is nothing to build from', () => {
    expect(buildBilheteShareUrl({})).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd api && npx jest bilhete-share --silent`
Expected: FAIL — `Cannot find module './bilhete-share'`.

- [ ] **Step 4: Implement the pure module**

Create `api/src/contexts/admin/bilhete-share.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { buildEsportivaSelectionsUrl } from '../sports-feed/esportiva-link';
import { CreateBilheteDto } from './dto/bilhete.dto';

/**
 * Accept either a server-shared coupon (`esportiva.bet.br?shareCode=…`) or an
 * affiliate pre-fill link (`go.aff.esportiva.bet?selections=…`). Anything else
 * — or non-HTTPS — is rejected. Returns the normalized URL string.
 */
export function validateEsportivaShareUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException('Invalid Esportiva share URL');
  }
  if (url.protocol !== 'https:') {
    throw new BadRequestException('Esportiva share URL must be HTTPS');
  }
  const isShare =
    url.hostname === 'esportiva.bet.br' && !!url.searchParams.get('shareCode');
  const isSelections =
    url.hostname === 'go.aff.esportiva.bet' &&
    !!url.searchParams.get('selections');
  if (!isShare && !isSelections) {
    throw new BadRequestException(
      'Esportiva URL must include shareCode or selections',
    );
  }
  return url.toString();
}

/**
 * Turn a create-DTO into the pre-filled deep-link, or null when it lacks the
 * sportsbook ids. Múltipla: every leg must carry `eventExternalId` + `oddId`.
 * Simples: the top-level `eventExternalId` + `oddId`.
 */
export function buildBilheteShareUrl(
  dto: Pick<CreateBilheteDto, 'legs' | 'eventExternalId' | 'oddId'>,
): string | null {
  if (dto.legs && dto.legs.length > 0) {
    const pairs = dto.legs
      .filter((l) => !!l.eventExternalId && l.oddId != null)
      .map((l) => ({ eventId: l.eventExternalId!, oddId: l.oddId! }));
    if (pairs.length !== dto.legs.length) return null;
    return buildEsportivaSelectionsUrl(pairs);
  }
  if (dto.eventExternalId && dto.oddId != null) {
    return buildEsportivaSelectionsUrl([
      { eventId: dto.eventExternalId, oddId: dto.oddId },
    ]);
  }
  return null;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd api && npx jest bilhete-share --silent`
Expected: PASS.

- [ ] **Step 6: Wire the module into the service**

In `bilhetes.service.ts`, delete the local `validateEsportivaShareUrl` function (lines 21-38) and add to the imports at the top:

```typescript
import { validateEsportivaShareUrl, buildBilheteShareUrl } from './bilhete-share';
```

Replace the `create` method (lines 253-268) with:

```typescript
  create(dto: CreateBilheteDto) {
    const { publish, startsAt, validUntil, legs, esportivaShareUrl, ...data } = dto;
    // Prefer a link generated from the picked selections (source of truth);
    // fall back to a pasted URL, validated.
    const generated = buildBilheteShareUrl(dto);
    const shareUrl =
      generated ??
      (esportivaShareUrl ? validateEsportivaShareUrl(esportivaShareUrl) : undefined);
    return this.prisma.bilhete.create({
      data: {
        ...data,
        ...(shareUrl ? { esportivaShareUrl: shareUrl } : {}),
        ...(legs ? { legs: { create: legsCreate(legs) } } : {}),
        startsAt: new Date(startsAt),
        validUntil: validUntil ? new Date(validUntil) : new Date(startsAt),
        // Live by default: the admin creates a ticket to sell it now.
        publishedAt: publish === false ? null : new Date(),
      },
    });
  }
```

Note: `...data` now includes the top-level `oddId` (a `Bilhete` column) and `legsCreate` passes each leg's `eventExternalId`/`oddId` straight through, since they are now columns.

- [ ] **Step 7: Verify the api compiles and the admin suite passes**

Run: `cd api && npx tsc --noEmit && npx jest bilhete-share esportiva-link altenar.normalize --silent`
Expected: no type errors; all listed suites PASS.

- [ ] **Step 8: Commit**

```bash
git add api/src/contexts/admin/dto/bilhete.dto.ts api/src/contexts/admin/bilhete-share.ts api/src/contexts/admin/bilhete-share.spec.ts api/src/contexts/admin/bilhetes.service.ts
git commit -m "feat(admin): generate Esportiva selections link on bilhete create"
```

---

## Task 5: Web basket helpers (pure)

Pure functions so the accumulate/dedup/combined-odd logic is unit-tested without rendering.

**Files:**
- Create: `web/src/features/admin/esportivaBasket.ts`
- Create: `web/src/features/admin/esportivaBasket.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `web/src/features/admin/esportivaBasket.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { toggleBasketLeg, combinedOdd, isLegInBasket, type BasketLeg } from './esportivaBasket';

const leg = (over: Partial<BasketLeg> = {}): BasketLeg => ({
  eventExternalId: '16027574',
  homeTeam: 'Corinthians',
  awayTeam: 'Grêmio',
  mercado: '1x2',
  mercadoLabel: 'Resultado Final',
  selecao: 'Corinthians',
  linha: null,
  odd: 1.54,
  oddId: 4049555380,
  ...over,
});

describe('toggleBasketLeg', () => {
  it('adds a leg to an empty basket', () => {
    expect(toggleBasketLeg([], leg())).toHaveLength(1);
  });

  it('removes a leg already present (same event + oddId)', () => {
    const l = leg();
    expect(toggleBasketLeg([l], l)).toEqual([]);
  });

  it('replaces the pick when the same event+market gets a different selection', () => {
    const home = leg();
    const draw = leg({ selecao: 'Empate', oddId: 999, odd: 3.2 });
    const next = toggleBasketLeg([home], draw);
    expect(next).toHaveLength(1);
    expect(next[0].oddId).toBe(999);
  });

  it('keeps legs from different events side by side', () => {
    const a = leg();
    const b = leg({ eventExternalId: '16998999', oddId: 4219529561, odd: 1.75 });
    expect(toggleBasketLeg([a], b)).toHaveLength(2);
  });
});

describe('combinedOdd', () => {
  it('multiplies the leg odds', () => {
    const a = leg({ odd: 1.5 });
    const b = leg({ eventExternalId: '2', oddId: 2, odd: 2 });
    expect(combinedOdd([a, b])).toBeCloseTo(3.0, 5);
  });
  it('is 1 for an empty basket', () => {
    expect(combinedOdd([])).toBe(1);
  });
});

describe('isLegInBasket', () => {
  it('matches on event + oddId', () => {
    expect(isLegInBasket([leg()], '16027574', 4049555380)).toBe(true);
    expect(isLegInBasket([leg()], '16027574', 111)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd web && npx vitest run esportivaBasket`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helpers**

Create `web/src/features/admin/esportivaBasket.ts`:

```typescript
// web/src/features/admin/esportivaBasket.ts
// Pure logic for the admin "cesta": accumulate clicked sportsbook selections,
// dedup, and compute the combined odd. UI lives in AdminBilhetes.tsx.

export interface BasketLeg {
  eventExternalId: string;
  homeTeam: string;
  awayTeam: string;
  mercado: string;
  mercadoLabel: string;
  selecao: string;
  linha: number | null;
  odd: number;
  oddId: number;
}

/**
 * Toggle a leg in the basket:
 *  - clicking the exact same selection (event + oddId) removes it;
 *  - a different selection for the same (event + market) replaces that pick;
 *  - otherwise the leg is appended.
 */
export function toggleBasketLeg(basket: BasketLeg[], leg: BasketLeg): BasketLeg[] {
  const isExact = (l: BasketLeg) =>
    l.eventExternalId === leg.eventExternalId && l.oddId === leg.oddId;
  if (basket.some(isExact)) {
    return basket.filter((l) => !isExact(l));
  }
  const sameMarket = (l: BasketLeg) =>
    l.eventExternalId === leg.eventExternalId && l.mercado === leg.mercado;
  return [...basket.filter((l) => !sameMarket(l)), leg];
}

/** Product of the leg odds (1 for an empty basket). */
export function combinedOdd(basket: BasketLeg[]): number {
  return basket.reduce((acc, l) => acc * l.odd, 1);
}

/** True when this exact selection (event + oddId) is in the basket. */
export function isLegInBasket(
  basket: BasketLeg[],
  eventExternalId: string,
  oddId: number,
): boolean {
  return basket.some(
    (l) => l.eventExternalId === eventExternalId && l.oddId === oddId,
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd web && npx vitest run esportivaBasket`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/admin/esportivaBasket.ts web/src/features/admin/esportivaBasket.spec.ts
git commit -m "feat(admin-web): add pure cesta (basket) helpers"
```

---

## Task 6: Wire the basket into the admin UI

Add `oddId` to the web types, then let each selection button toggle a basket, show a basket panel (legs + combined odd), and generate a bilhete (simples if 1 leg, múltipla if 2+) that posts the sportsbook ids so the backend builds the link.

**Files:**
- Modify: `web/src/features/admin/adminApi.ts:98-102, 144-172`
- Modify: `web/src/features/admin/AdminBilhetes.tsx` (imports, state, `onPickSelection`/basket, `renderMarkets`, its two call sites, and a new panel + generate handler)

- [ ] **Step 1: Add `oddId` to the web API types**

In `adminApi.ts`, update `SportSelection` (lines 98-102):

```typescript
export interface SportSelection {
  label: string;
  odd: number;
  line: number | null;
  oddId: number;
}
```

In `CreateBilheteInput`, add `oddId?` at the top level (after `odd: number;`, line 159) and extend each leg:

```typescript
  odd: number;
  oddId?: number;
  eventDeepLink?: string;
  eventExternalId?: string;
  esportivaShareUrl?: string;
  legs?: {
    homeTeam: string;
    awayTeam: string;
    mercado: string;
    selecao: string;
    linha?: number;
    odd: number;
    eventExternalId?: string;
    oddId?: number;
  }[];
```

- [ ] **Step 2: Import the basket helpers and add state**

In `AdminBilhetes.tsx`, add to the imports near the top (after the `adminApi` import block):

```typescript
import {
  toggleBasketLeg,
  combinedOdd,
  isLegInBasket,
  type BasketLeg,
} from './esportivaBasket';
```

Add basket state next to `multipleLegs` (after line 159 `const [multipleLegs, …]`):

```typescript
  const [basket, setBasket] = useState<BasketLeg[]>([]);
  const [basketCat, setBasketCat] = useState<BilheteCategoria>('multiplas');
```

- [ ] **Step 3: Add the basket toggle handler**

In `AdminBilhetes.tsx`, right after the existing `onPickSelection` function (ends line 427), add:

```typescript
  /** Add/remove a clicked selection to the cesta, carrying its sportsbook ids. */
  function onToggleBasket(
    ev: { externalId: string; homeTeam: string; awayTeam: string },
    market: SportMarket,
    selection: SportSelection,
  ) {
    setBasket((b) =>
      toggleBasketLeg(b, {
        eventExternalId: ev.externalId,
        homeTeam: ev.homeTeam,
        awayTeam: ev.awayTeam,
        mercado: market.key,
        mercadoLabel: marketTitle(market),
        selecao: selection.label,
        linha: selection.line,
        odd: Number(selection.odd),
        oddId: selection.oddId,
      }),
    );
  }

  /** Turn the cesta into a bilhete: simples (1 leg) or múltipla (2+). */
  async function onGenerateFromBasket() {
    if (basket.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const soonest = basket[0];
      const combined = combinedOdd(basket);
      if (basket.length === 1) {
        const l = basket[0];
        await adminApi.createBilhete({
          categoria: basketCat,
          mercado: l.mercado,
          selecao: l.selecao,
          linha: l.linha ?? undefined,
          homeTeam: l.homeTeam,
          awayTeam: l.awayTeam,
          homeLogo: crestUrl(l.homeTeam),
          awayLogo: crestUrl(l.awayTeam),
          startsAt: new Date().toISOString(),
          odd: l.odd,
          eventExternalId: l.eventExternalId,
          oddId: l.oddId,
        });
      } else {
        await adminApi.createBilhete({
          categoria: basketCat,
          titulo: 'Múltipla',
          homeTeam: soonest.homeTeam,
          awayTeam: soonest.awayTeam,
          homeLogo: crestUrl(soonest.homeTeam),
          awayLogo: crestUrl(soonest.awayTeam),
          startsAt: new Date().toISOString(),
          odd: Number(combined.toFixed(2)),
          legs: basket.map((l) => ({
            homeTeam: l.homeTeam,
            awayTeam: l.awayTeam,
            mercado: l.mercado,
            selecao: l.selecao,
            linha: l.linha ?? undefined,
            odd: l.odd,
            eventExternalId: l.eventExternalId,
            oddId: l.oddId,
          })),
        });
      }
      setBasket([]);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
```

- [ ] **Step 4: Give `renderMarkets` an event context and a basket toggle**

Replace `renderMarkets` (lines 706-736) with a version that takes the event identity and adds a cesta button per selection:

```typescript
  /** The clickable market/selection grid, shared by the synced pick + preview. */
  function renderMarkets(
    markets: SportMarket[],
    ev: { externalId: string; homeTeam: string; awayTeam: string },
  ) {
    return (
      <div className="ab-markets">
        {markets.map((market) => (
          <section className="ab-market" key={`${market.typeId}-${market.key}`}>
            <h3>{marketTitle(market)}</h3>
            <div className="ab-market__grid">
              {market.selections.map((selection) => {
                const active =
                  form.mercado === market.key &&
                  form.selecao === selection.label &&
                  form.linha === lineValue(selection.line);
                const inBasket = isLegInBasket(
                  basket,
                  ev.externalId,
                  selection.oddId,
                );
                return (
                  <div
                    className="ab-selection-wrap"
                    key={`${selection.label}-${selection.line ?? 'noline'}`}
                  >
                    <button
                      type="button"
                      className="ab-selection"
                      data-active={active}
                      onClick={() => onPickSelection(market, selection)}
                    >
                      <span>{selection.label}</span>
                      <b>{Number(selection.odd).toFixed(2)}</b>
                    </button>
                    <button
                      type="button"
                      className="ab-selection__cesta"
                      data-in-basket={inBasket}
                      title={inBasket ? 'Remover da cesta' : 'Adicionar à cesta'}
                      onClick={() => onToggleBasket(ev, market, selection)}
                    >
                      {inBasket ? '✓' : '＋'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }
```

- [ ] **Step 5: Update the two `renderMarkets` call sites to pass the event context**

At the preview call site (was line 982):

```tsx
              renderMarkets(sortedMarkets(preview.markets), {
                externalId: preview.externalId,
                homeTeam: preview.homeTeam,
                awayTeam: preview.awayTeam,
              })
```

At the synced-event call site (was line 1039) — it renders the currently selected event's markets. Replace `renderMarkets(eventMarkets)` with a guarded call using the selected event:

```tsx
              selectedEvent &&
              renderMarkets(eventMarkets, {
                externalId: selectedEvent.externalId,
                homeTeam: selectedEvent.homeTeam,
                awayTeam: selectedEvent.awayTeam,
              })
```

If a `selectedEvent` binding does not already exist in scope there, add it just above the `return (` of the component (near line 705):

```typescript
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;
```

(Confirm the property used for `eventMarkets`/selection — it is keyed by `selectedEventId`. Match `e.id` as above; the synced list uses the row `id`, while `externalId` is the sportsbook id sent to the backend.)

- [ ] **Step 6: Render the basket panel**

Add this panel just before the create `<form …onSubmit={onCreate}>` opens (inside the `showCreate` block, near the sync/preview UI, e.g. right after the preview markets section). Place it where it is visible while picking:

```tsx
      {basket.length > 0 && (
        <aside className="ab-basket">
          <header>
            <b>Cesta ({basket.length})</b>
            <span>Odd combinada {combinedOdd(basket).toFixed(2)}</span>
          </header>
          <ul>
            {basket.map((l) => (
              <li key={`${l.eventExternalId}-${l.oddId}`}>
                <span>
                  {l.homeTeam} x {l.awayTeam} — {l.mercadoLabel}: {l.selecao}
                </span>
                <b>{l.odd.toFixed(2)}</b>
                <button
                  type="button"
                  onClick={() =>
                    setBasket((b) =>
                      b.filter(
                        (x) =>
                          !(
                            x.eventExternalId === l.eventExternalId &&
                            x.oddId === l.oddId
                          ),
                      ),
                    )
                  }
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
          <div className="ab-basket__actions">
            <label>
              Categoria{' '}
              <select
                value={basketCat}
                onChange={(e) => setBasketCat(e.target.value as BilheteCategoria)}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={() => setBasket([])} disabled={busy}>
              Limpar
            </button>
            <button type="button" onClick={onGenerateFromBasket} disabled={busy}>
              {basket.length === 1
                ? 'Gerar bilhete simples'
                : 'Gerar múltipla'}
            </button>
          </div>
        </aside>
      )}
```

- [ ] **Step 7: Add minimal styles for the basket + cesta button**

Append to the admin bilhetes stylesheet (the file that defines `.ab-selection`; find it with `cd web && npx vitest --version >/dev/null; grep -rl "\.ab-selection" src`). Add:

```css
.ab-selection-wrap { display: flex; align-items: stretch; gap: 4px; }
.ab-selection__cesta {
  min-width: 34px; border: 1px solid var(--ab-border, #334); border-radius: 8px;
  background: transparent; color: inherit; cursor: pointer; font-weight: 700;
}
.ab-selection__cesta[data-in-basket='true'] { background: #16794f; color: #fff; border-color: #16794f; }
.ab-basket { margin: 16px 0; padding: 12px; border: 1px solid #334; border-radius: 12px; }
.ab-basket header { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
.ab-basket ul { list-style: none; margin: 0 0 10px; padding: 0; display: grid; gap: 6px; }
.ab-basket li { display: flex; align-items: center; gap: 8px; justify-content: space-between; font-size: 13px; }
.ab-basket__actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
```

- [ ] **Step 8: Typecheck, run web tests, and build**

Run: `cd web && npx tsc --noEmit && npx vitest run esportivaBasket && npm run build`
Expected: no type errors; basket tests PASS; production build succeeds.

- [ ] **Step 9: Manual smoke test**

1. Start api + web (docker postgres up, `cd api && npm run start:dev`, `cd web && npm run dev`).
2. In the admin, open **Criar bilhete**, run **Sync** (so stored events carry `oddId`), or paste an Esportiva match link to preview.
3. Click **＋** on two selections from two different games → the cesta shows 2 legs and a combined odd.
4. Pick a categoria, click **Gerar múltipla**.
5. On the public app, open that bilhete and click **Adicionar** → Esportiva opens with both legs pre-filled.

Note the "às vezes 1 perna" behavior from the spec: if a leg's odd was suspended between generation and click, Esportiva drops it — expected, not a regression.

- [ ] **Step 10: Commit**

```bash
git add web/src/features/admin/adminApi.ts web/src/features/admin/AdminBilhetes.tsx web/src/features/admin
git commit -m "feat(admin-web): cesta to build pre-filled Esportiva bilhetes"
```

---

## Task 7: Document the affiliate env var

**Files:**
- Modify/Create: `api/.env.example` (and note it in deploy env)

- [ ] **Step 1: Document the variable**

Add to `api/.env.example` (create the line if the file exists; if not, note it in `docs/superpowers/ARCHITECTURE.md` env section):

```dotenv
# Affiliate base for the pre-filled Esportiva bet-slip link. The app appends
# `?selections={eventId}-{oddId},...`. Swap the affiliate code here.
ESPORTIVA_SELECTIONS_BASE_URL=https://go.aff.esportiva.bet/nwxez5q1
```

- [ ] **Step 2: Commit**

```bash
git add api/.env.example
git commit -m "docs: document ESPORTIVA_SELECTIONS_BASE_URL affiliate base"
```

---

## Self-Review notes

- **Spec coverage:** oddId plumbing (Task 1), URL helper + env affiliate (Task 2, 7), schema (Task 3), relaxed validation + backend generation (Task 4), basket accumulate/dedup/combined-odd (Task 5), UI + save simples/múltipla (Task 6). Public CTA unchanged (uses `esportivaShareUrl ?? deepLink`) — no task needed.
- **Deviation from spec §3.4 (regenerate action):** intentionally omitted. Rebuilding from *stored* oddIds yields the identical URL (no value); the useful version is a live-refresh, which the spec itself scopes to v2 (§5). Storing `oddId` per leg (Task 3) keeps that v2 door open.
- **Type consistency:** `NormalizedSelection.oddId` / web `SportSelection.oddId` (both `number`); `BasketLeg` shape matches the leg payload posted in Task 6; `buildEsportivaSelectionsUrl` pair shape `{eventId, oddId}` used identically in Task 2 and Task 4.
