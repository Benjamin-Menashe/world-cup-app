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
  const dbPlayers = await prisma.player.findMany({
    include: { team: true }
  });

  // Fetch top scorers from API
  const scorersRes = await fetch(`${API_BASE}/players/topscorers?league=1&season=2026`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  const scorersData = await scorersRes.json();
  const scorers = scorersData.response || [];

  console.log('--- Discrepancy report: DB vs API Top Scorers ---');
  for (const scorer of scorers) {
    const apiGoals = scorer.statistics[0]?.goals?.total ?? 0;
    const apiName = scorer.player.name.toLowerCase();

    // Standard matching
    const match = dbPlayers.find((p) =>
      p.name.toLowerCase().includes(apiName) ||
      apiName.includes(p.name.toLowerCase())
    );

    if (match) {
      if (match.goalsScored !== apiGoals) {
        console.log(`❌ Player: "${match.name}" (Team: ${match.team.name})`);
        console.log(`   DB Goals: ${match.goalsScored}`);
        console.log(`   API Goals: ${apiGoals}`);
      }
    } else {
      console.log(`⚠️ Scorer in API top scorers not matched to any DB Player: "${scorer.player.name}" (${apiGoals} goals)`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
