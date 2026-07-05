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
  // Find France team ID in DB
  const france = await prisma.team.findFirst({
    where: { name: 'France' }
  });

  if (!france) {
    console.log('France team not found in DB.');
    return;
  }

  console.log(`France Team ID: ${france.id}`);

  // Find all games for France
  const games = await prisma.game.findMany({
    where: {
      OR: [
        { homeTeamId: france.id },
        { awayTeamId: france.id }
      ]
    },
    include: {
      homeTeam: true,
      awayTeam: true
    }
  });

  console.log(`Found ${games.length} games for France.`);

  // Let's call the API to get fixtures for France or we can map DB games to API fixtures using diagnose-sync logic.
  // First, let's fetch all fixtures from the API.
  const url = `${API_BASE}/fixtures?league=1&season=2026`;
  console.log(`Fetching all fixtures from API: ${url}`);
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  const data = await res.json();
  const fixtures = data.response || [];
  console.log(`Got ${fixtures.length} fixtures from API`);

  for (const game of games) {
    // Find matching API fixture
    const homeName = game.homeTeam.name.toLowerCase();
    const awayName = game.awayTeam.name.toLowerCase();
    const fixture = fixtures.find(f => 
      f.teams.home.name.toLowerCase() === homeName &&
      f.teams.away.name.toLowerCase() === awayName
    );

    if (!fixture) {
      console.log(`Could not find API fixture for ${game.homeTeam.name} vs ${game.awayTeam.name}`);
      continue;
    }

    console.log(`\nGame: ${game.homeTeam.name} vs ${game.awayTeam.name}`);
    console.log(`DB Game ID: ${game.id}`);
    console.log(`API Fixture ID: ${fixture.fixture.id}`);
    console.log(`Status in DB: ${game.isFinished ? 'Finished' : 'Not Finished'}, Status in API: ${fixture.fixture.status.short}`);
    console.log(`Score in DB: ${game.homeScore}-${game.awayScore}, Score in API: ${fixture.goals.home}-${fixture.goals.away}`);

    // Fetch events for this fixture
    const evUrl = `${API_BASE}/fixtures/events?fixture=${fixture.fixture.id}`;
    console.log(`Fetching events from: ${evUrl}`);
    const evRes = await fetch(evUrl, { headers: { 'x-apisports-key': API_KEY } });
    const evData = await evRes.json();
    const events = evData.response || [];
    console.log(`Got ${events.length} events.`);
    
    // Filter goals
    const goals = events.filter(e => e.type === 'Goal');
    console.log('Goal events:');
    goals.forEach(e => {
      console.log(`- Player: ${e.player.name} (${e.player.id}), Type: ${e.type}, Detail: ${e.detail}, Comments: ${e.comments}, Assist: ${e.assist?.name}`);
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
