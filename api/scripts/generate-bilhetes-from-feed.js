// Generate a fresh set of "current" bilhetes from the live Altenar/Esportiva
// feed (the same source the reference app uses). Picks only fixtures whose BOTH
// teams cross-match a crest in our catalog, so every card shows real logos, and
// distributes them across the categories by favourite-odd bucket with gradeable
// markets (1x2 / over_under). Deterministic ids (feed-*) → idempotent, so this
// can be re-run to refresh. NBA/NFL "ligas" stay on the static seed (the feed is
// football-only).
//
// Run inside the running api container (compiled dist), e.g.:
//   docker cp api/scripts/generate-bilhetes-from-feed.js tips-app-api-1:/app/gen.js
//   docker exec tips-app-api-1 node /app/gen.js
// APP_DIST overrides where the compiled app lives (default /app/dist).
const path = require('path');
const DIST = process.env.APP_DIST || '/app/dist';
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require(path.join(DIST, 'src/app.module'));
const { PrismaService } = require(path.join(DIST, 'src/prisma/prisma.service'));
const {
  buildTeamLogoIndex,
  matchTeamLogo,
} = require(path.join(DIST, 'src/modules/sports-feed/team-logo.match'));

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const round2 = (n) => Math.round(n * 100) / 100;
const logoUrl = (id) => `/api/team-logos/${id}.png`;

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const prisma = app.get(PrismaService);

    const teams = await prisma.team.findMany({
      select: { externalId: true, name: true, logoUrl: true, country: true },
    });
    const index = buildTeamLogoIndex(teams);

    const now = new Date();
    const events = await prisma.sportEvent.findMany({
      where: { startsAt: { gte: new Date(now.getTime() + 30 * 60_000) } }, // ≥30min out
      orderBy: { startsAt: 'asc' },
      take: 516,
    });

    // Keep only fixtures with both crests + a valid 1X2 board.
    const pool = [];
    for (const e of events) {
      const oh = Number(e.oddHome);
      const oa = Number(e.oddAway);
      if (!oh || !oa) continue;
      const homeRef = matchTeamLogo(e.homeTeam, index, e.countryIso);
      const awayRef = matchTeamLogo(e.awayTeam, index, e.countryIso);
      if (!homeRef || !awayRef) continue;
      const favSide = oh <= oa ? 'home' : 'away';
      pool.push({
        e,
        home: clean(e.homeTeam),
        away: clean(e.awayTeam),
        homeLogo: logoUrl(homeRef.externalId),
        awayLogo: logoUrl(awayRef.externalId),
        comp: clean(e.competition),
        oh,
        od: Number(e.oddDraw) || null,
        oa,
        favSide,
        favOdd: Math.min(oh, oa),
        dogOdd: Math.max(oh, oa),
        markets: Array.isArray(e.markets) ? e.markets : [],
      });
    }
    pool.sort((a, b) => a.favOdd - b.favOdd);

    const used = new Set();
    const take = (pred, n) => {
      const out = [];
      for (const p of pool) {
        if (out.length >= n) break;
        if (used.has(p.e.id)) continue;
        if (pred(p)) {
          used.add(p.e.id);
          out.push(p);
        }
      }
      return out;
    };

    const favPick = (p) => (p.favSide === 'home' ? p.home : p.away);
    const favTitulo = (p) =>
      p.favSide === 'home' ? 'Vitória mandante' : 'Vitória visitante';
    const favLogo = (p) => (p.favSide === 'home' ? p.homeLogo : p.awayLogo);
    const overSel = (p) => {
      const m = p.markets.find((x) => x.key === 'over_under');
      if (!m) return null;
      const s = (m.selections || []).find(
        (x) => /mais/i.test(x.label) && Number(x.line) === 2.5 && x.odd > 0,
      );
      return s ? { label: clean(s.label), odd: Number(s.odd), line: 2.5 } : null;
    };

    // secundario needs an Over/Under board — reserve those first.
    const secundario = take((p) => !!overSel(p) && p.favOdd <= 2.2, 2);
    const safes = take((p) => p.favOdd >= 1.35 && p.favOdd <= 1.66, 5);
    const pro = take((p) => p.favOdd >= 1.67 && p.favOdd <= 2.05, 4);
    const ultra = take((p) => p.favOdd >= 2.06 && p.favOdd <= 2.6, 3);
    const alav = take((p) => p.dogOdd >= 2.6 && p.dogOdd <= 4.6, 2);

    const rows = [];
    const push = (id, categoria, p, extra) =>
      rows.push({
        id,
        categoria,
        homeTeam: p.home,
        homeColor: null,
        homeLogo: p.homeLogo,
        awayTeam: p.away,
        awayColor: null,
        awayLogo: p.awayLogo,
        competition: p.comp,
        startsAt: p.e.startsAt,
        validUntil: null,
        eventDeepLink: p.e.deepLink,
        eventExternalId: p.e.externalId,
        resultado: 'pending',
        publishedAt: new Date(),
        ...extra,
      });

    safes.forEach((p, i) =>
      push(`feed-safes-${i + 1}`, 'safes', p, {
        titulo: favTitulo(p),
        mercado: '1x2',
        selecao: favPick(p),
        linha: null,
        odd: round2(p.favOdd),
      }),
    );
    pro.forEach((p, i) =>
      push(`feed-pro-${i + 1}`, 'pro', p, {
        titulo: favTitulo(p),
        mercado: '1x2',
        selecao: favPick(p),
        linha: null,
        odd: round2(p.favOdd),
      }),
    );
    ultra.forEach((p, i) =>
      push(`feed-ultra-${i + 1}`, 'ultra', p, {
        titulo: favTitulo(p),
        mercado: '1x2',
        selecao: favPick(p),
        linha: null,
        odd: round2(p.favOdd),
      }),
    );
    alav.forEach((p, i) => {
      const dogSide = p.favSide === 'home' ? 'away' : 'home';
      push(`feed-alav-${i + 1}`, 'alavancagem', p, {
        titulo: 'Zebra do dia',
        mercado: '1x2',
        selecao: dogSide === 'home' ? p.home : p.away,
        linha: null,
        odd: round2(p.dogOdd),
      });
    });
    secundario.forEach((p, i) => {
      const o = overSel(p);
      push(`feed-sec-${i + 1}`, 'secundario', p, {
        titulo: 'Mais de 2.5 gols',
        mercado: 'over_under',
        selecao: o.label,
        linha: 2.5,
        odd: round2(o.odd),
      });
    });

    // Múltipla: combine the 3 lowest-odd safe favourites into one accumulator.
    if (safes.length >= 3) {
      const legs = safes.slice(0, 3);
      const combined = round2(legs.reduce((acc, p) => acc * p.favOdd, 1));
      const face = legs[legs.length - 1]; // marquee-ish (highest of the three)
      rows.push({
        id: 'feed-mult-1',
        categoria: 'multiplas',
        titulo: 'Múltipla tripla',
        mercado: null,
        selecao: legs.map((p) => favPick(p)).join(' + '),
        linha: null,
        homeTeam: face.home,
        homeColor: null,
        homeLogo: face.homeLogo,
        awayTeam: face.away,
        awayColor: null,
        awayLogo: face.awayLogo,
        competition: 'Múltipla do dia',
        startsAt: face.e.startsAt,
        validUntil: null,
        eventDeepLink: face.e.deepLink,
        eventExternalId: face.e.externalId,
        odd: combined,
        resultado: 'pending',
        publishedAt: new Date(),
      });
    }

    for (const r of rows) {
      const { id, ...data } = r;
      await prisma.bilhete.upsert({ where: { id }, create: { id, ...data }, update: data });
      console.log('UPSERT', id, r.categoria, '|', r.homeTeam, 'x', r.awayTeam, '|', r.selecao, '@', r.odd);
    }
    console.log('GENERATED', rows.length, 'bilhetes across categories');
    console.log(
      'COUNTS',
      JSON.stringify({
        safes: safes.length,
        pro: pro.length,
        ultra: ultra.length,
        alavancagem: alav.length,
        secundario: secundario.length,
        multiplas: safes.length >= 3 ? 1 : 0,
      }),
    );
  } finally {
    await app.close();
  }
})().catch((e) => {
  console.error('GEN_ERROR', e);
  process.exit(1);
});
