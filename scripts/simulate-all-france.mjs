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
  } catch { }
}

loadEnv('.env.local');
loadEnv('.env');

const API_KEY = process.env.API_FOOTBALL_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const france = await prisma.team.findFirst({ where: { name: 'France' } });
  if (!france) return;

  const dbPlayers = await prisma.player.findMany();

  const games = await prisma.game.findMany({
    where: {
      OR: [
        { homeTeamId: france.id },
        { awayTeamId: france.id }
      ]
    },
    include: { homeTeam: true, awayTeam: true }
  });

  const url = `${API_BASE}/fixtures?league=1&season=2026`;
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  const data = await res.json();
  const fixtures = data.response || [];

  for (const game of games) {
    const homeName = game.homeTeam.name.toLowerCase();
    const awayName = game.awayTeam.name.toLowerCase();
    const fixture = fixtures.find(f => 
      f.teams.home.name.toLowerCase() === homeName &&
      f.teams.away.name.toLowerCase() === awayName
    );

    if (!fixture) continue;

    const evUrl = `${API_BASE}/fixtures/events?fixture=${fixture.fixture.id}`;
    const evRes = await fetch(evUrl, { headers: { 'x-apisports-key': API_KEY } });
    const evData = await evRes.json();
    const events = evData.response || [];

    console.log(`\nMatch: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
    const goals = events.filter((e) => e.type === 'Goal' && (e.detail === 'Normal Goal' || e.detail === 'Penalty') && e.comments !== 'Penalty Shootout');

    for (const goal of goals) {
      const apiName = goal.player.name.toLowerCase();
      // Match using the logic from route.ts:
      const match = dbPlayers.find(p => p.name.toLowerCase().includes(apiName) || apiName.includes(p.name.toLowerCase()));
      
      console.log(`- Goal event player name: "${goal.player.name}" (${goal.detail})`);
      if (match) {
        console.log(`  ✅ MATCHED to DB Player: "${match.name}" (ID: ${match.id})`);
      } else {
        console.log(`  ❌ NOT MATCHED to any DB Player!`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
