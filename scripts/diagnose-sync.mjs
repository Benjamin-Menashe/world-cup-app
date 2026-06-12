/**
 * Diagnose why scores aren't syncing.
 * Tests: DB connectivity, API key, API response, and team-name matching.
 *
 * Usage:  node scripts/diagnose-sync.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Simple .env loader (no dotenv dependency)
function loadEnv(filepath) {
  try {
    const content = readFileSync(resolve(filepath), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* file doesn't exist, that's fine */ }
}

loadEnv('.env.local');
loadEnv('.env');

const API_KEY = process.env.API_FOOTBALL_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 1;
const SEASON = 2026;

console.log('\n=== SYNC DIAGNOSTICS ===\n');

// ── 1. Check API key ────────────────────────────────────────────────────────
console.log('1️⃣  API_FOOTBALL_KEY:', API_KEY ? `SET (${API_KEY.slice(0, 6)}…)` : '❌ MISSING');
if (!API_KEY) {
  console.log('   → No API key found in .env.local or .env. The sync cannot call the football API.');
  console.log('   → Set API_FOOTBALL_KEY in your environment variables.\n');
}

// ── 2. Call the API ─────────────────────────────────────────────────────────
console.log('\n2️⃣  Calling API-Football fixtures endpoint…');
try {
  const url = `${API_BASE}/fixtures?league=${LEAGUE_ID}&season=${SEASON}`;
  console.log(`   URL: ${url}`);

  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
  });

  console.log(`   HTTP status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const body = await res.text();
    console.log('   ❌ API returned an error:');
    console.log('   ', body.slice(0, 500));
    process.exit(1);
  }

  const data = await res.json();
  const fixtures = data.response || [];
  console.log(`   ✅ Got ${fixtures.length} fixtures from API`);

  // Show remaining API quota
  const remaining = res.headers.get('x-ratelimit-requests-remaining');
  if (remaining) console.log(`   📊 API calls remaining today: ${remaining}`);

  if (fixtures.length === 0) {
    console.log('   ⚠️  API returned 0 fixtures — check league/season IDs or API subscription.');
    process.exit(1);
  }

  // ── 3. Show fixtures with scores ──────────────────────────────────────────
  console.log('\n3️⃣  Fixtures with non-NS status (started/finished):');
  const withStatus = fixtures.filter(f => f.fixture.status.short !== 'NS').slice(0, 10);
  if (withStatus.length === 0) {
    console.log('   All fixtures have status NS (Not Started) — no scores available from API yet.');
    console.log('   First 3 fixtures:');
    fixtures.slice(0, 3).forEach(f => {
      console.log(`   • ${f.teams.home.name} vs ${f.teams.away.name} | status: ${f.fixture.status.short} | date: ${f.fixture.date}`);
    });
  } else {
    withStatus.forEach(f => {
      const status = f.fixture.status.short;
      const goals = `${f.goals.home ?? 'null'}-${f.goals.away ?? 'null'}`;
      const ft = `${f.score.fulltime.home ?? 'null'}-${f.score.fulltime.away ?? 'null'}`;
      console.log(`   • ${f.teams.home.name} vs ${f.teams.away.name} | status: ${status} | goals: ${goals} | fulltime: ${ft}`);
    });
  }

  // ── 4. Check team-name matching against DB ────────────────────────────────
  console.log('\n4️⃣  Checking team-name matching against DB…');

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const dbGames = await prisma.game.findMany({
    include: { homeTeam: true, awayTeam: true },
  });
  console.log(`   DB has ${dbGames.length} games total`);

  let matched = 0;
  let unmatched = 0;
  const unmatchedList = [];

  for (const fixture of fixtures) {
    const homeName = fixture.teams.home.name.toLowerCase();
    const awayName = fixture.teams.away.name.toLowerCase();

    const g = dbGames.find(
      (match) =>
        match.homeTeam.name.toLowerCase() === homeName &&
        match.awayTeam.name.toLowerCase() === awayName
    );

    if (g) {
      matched++;
    } else {
      unmatched++;
      unmatchedList.push(`${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
    }
  }

  console.log(`   ✅ Matched: ${matched}/${fixtures.length}`);
  if (unmatched > 0) {
    console.log(`   ❌ Unmatched: ${unmatched}/${fixtures.length}`);
    console.log('   Unmatched API fixtures (team names don\'t match DB):');
    unmatchedList.slice(0, 20).forEach(m => console.log(`      • ${m}`));
    if (unmatchedList.length > 20) console.log(`      … and ${unmatchedList.length - 20} more`);
  }

  // ── 5. Show team name mismatches side-by-side ─────────────────────────────
  const dbTeamNames = new Set(dbGames.flatMap(g => [g.homeTeam.name.toLowerCase(), g.awayTeam.name.toLowerCase()]));
  const apiTeamNames = new Set(fixtures.flatMap(f => [f.teams.home.name.toLowerCase(), f.teams.away.name.toLowerCase()]));

  const inApiNotDb = [...apiTeamNames].filter(n => !dbTeamNames.has(n));
  const inDbNotApi = [...dbTeamNames].filter(n => !apiTeamNames.has(n));

  if (inApiNotDb.length > 0 || inDbNotApi.length > 0) {
    console.log('\n5️⃣  Team name mismatches:');
    if (inApiNotDb.length > 0) {
      console.log('   In API but NOT in DB:');
      inApiNotDb.forEach(n => console.log(`      • "${n}"`));
    }
    if (inDbNotApi.length > 0) {
      console.log('   In DB but NOT in API:');
      inDbNotApi.forEach(n => console.log(`      • "${n}"`));
    }
    console.log('\n   → These mismatches prevent the sync from matching API fixtures to DB games.');
  } else {
    console.log('\n5️⃣  All team names match between API and DB ✅');
  }

  // ── 6. Check CRON_SECRET ──────────────────────────────────────────────────
  console.log('\n6️⃣  Cron auth:');
  const cronSecret = process.env.CRON_SECRET;
  console.log(`   CRON_SECRET: ${cronSecret ? `SET (${cronSecret.slice(0, 6)}…)` : '❌ MISSING — Vercel cron calls will get 401'}`);

  await prisma.$disconnect();
  console.log('\n=== DONE ===\n');
} catch (err) {
  console.error('   ❌ Error:', err.message);
  process.exit(1);
}
