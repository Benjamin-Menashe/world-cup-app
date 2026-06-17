/**
 * Manual sync — runs the same logic as /api/sync directly against the DB.
 * Usage: node scripts/run-sync.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  } catch { /* ignore */ }
}
loadEnv('.env.local');
loadEnv('.env');

const API_KEY = process.env.API_FOOTBALL_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';

function teamNamesMatch(dbName, apiName) {
  const a = dbName.toLowerCase();
  const b = apiName.toLowerCase();
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  console.log('Fetching fixtures from API...');
  const res = await fetch(`${API_BASE}/fixtures?league=1&season=2026`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  const data = await res.json();
  const fixtures = data.response || [];
  console.log(`Got ${fixtures.length} fixtures`);

  const dbGames = await prisma.game.findMany({
    include: { homeTeam: true, awayTeam: true },
  });

  let updated = 0;
  for (const fixture of fixtures) {
    const g = dbGames.find(
      (match) =>
        teamNamesMatch(match.homeTeam.name, fixture.teams.home.name) &&
        teamNamesMatch(match.awayTeam.name, fixture.teams.away.name)
    );

    if (g) {
      const finishedStatus = ['FT', 'AET', 'PEN'];
      const isFinished = finishedStatus.includes(fixture.fixture.status.short);
      const homeScore = isFinished ? fixture.score.fulltime.home : fixture.goals.home;
      const awayScore = isFinished ? fixture.score.fulltime.away : fixture.goals.away;

      // Only update if there's new data
      if (homeScore !== null || awayScore !== null || isFinished !== g.isFinished) {
        await prisma.game.update({
          where: { id: g.id },
          data: {
            kickoffTime: new Date(fixture.fixture.date),
            homeScore,
            awayScore,
            isFinished,
          },
        });
        updated++;
        console.log(`  ✅ ${g.homeTeam.name} ${homeScore}-${awayScore} ${g.awayTeam.name} (${fixture.fixture.status.short})`);
      }
    }
  }

  console.log(`\nUpdated ${updated} games.`);

  // Verify
  const recheck = await prisma.game.findMany({
    where: { homeScore: { not: null } },
    include: { homeTeam: true, awayTeam: true },
  });
  console.log(`\nGames with scores in DB: ${recheck.length}`);
  recheck.forEach(g => console.log(`  ${g.homeTeam.name} ${g.homeScore}-${g.awayScore} ${g.awayTeam.name} (finished: ${g.isFinished})`));

  console.log('\nFetching top scorers from API...');
  const scorersRes = await fetch(`${API_BASE}/players/topscorers?league=1&season=2026`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  const scorersData = await scorersRes.json();
  const scorers = scorersData.response || [];
  console.log(`Got ${scorers.length} top scorers`);

  const dbPlayers = await prisma.player.findMany();
  let playersUpdated = 0;

  for (const scorer of scorers) {
    const apiGoals = scorer.statistics[0]?.goals?.total ?? 0;
    const apiName = scorer.player.name.toLowerCase();

    const match = dbPlayers.find((p) =>
      p.name.toLowerCase().includes(apiName) ||
      apiName.includes(p.name.toLowerCase())
    );

    if (match && match.goalsScored !== apiGoals) {
      await prisma.player.update({
        where: { id: match.id },
        data: { goalsScored: apiGoals },
      });
      playersUpdated++;
      console.log(`  ✅ ${match.name}: ${match.goalsScored} -> ${apiGoals} goals`);
    }
  }
  console.log(`\nUpdated ${playersUpdated} players.`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
