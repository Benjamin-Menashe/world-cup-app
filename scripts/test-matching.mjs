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
  const dbPlayers = await prisma.player.findMany();
  
  // Paraguay vs France fixture ID
  const fixtureId = 1569870;

  const evUrl = `${API_BASE}/fixtures/events?fixture=${fixtureId}`;
  console.log(`Fetching events from: ${evUrl}`);
  const evRes = await fetch(evUrl, { headers: { 'x-apisports-key': API_KEY } });
  const evData = await evRes.json();
  const events = evData.response || [];

  console.log('All events:');
  console.log(JSON.stringify(events, null, 2));

  console.log('\n--- Running filter logic ---');
  // From sync/route.ts:
  // const goals = events.filter((e: any) => e.type === 'Goal' && (e.detail === 'Normal Goal' || e.detail === 'Penalty') && e.comments !== 'Penalty Shootout')
  const goals = events.filter((e) => e.type === 'Goal' && (e.detail === 'Normal Goal' || e.detail === 'Penalty') && e.comments !== 'Penalty Shootout');

  console.log(`Filtered goals: ${goals.length}`);
  for (const goal of goals) {
    console.log('Goal event:', JSON.stringify(goal, null, 2));
    const apiName = goal.player.name.toLowerCase();
    console.log(`API player name lowercased: "${apiName}"`);
    
    const matches = dbPlayers.filter(p => p.name.toLowerCase().includes(apiName) || apiName.includes(p.name.toLowerCase()));
    console.log('Matches in DB:', matches.map(p => `${p.name} (id: ${p.id})`));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
