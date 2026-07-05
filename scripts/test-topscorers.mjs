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

async function main() {
  const scorersRes = await fetch(`${API_BASE}/players/topscorers?league=1&season=2026`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  const scorersData = await scorersRes.json();
  const scorers = scorersData.response || [];
  
  console.log(`Got ${scorers.length} top scorers.`);
  const mbappeScorer = scorers.find(s => s.player.name.toLowerCase().includes('mbappe') || s.player.name.toLowerCase().includes('mbappé'));
  if (mbappeScorer) {
    console.log('Mbappe in Top Scorers:', JSON.stringify(mbappeScorer, null, 2));
  } else {
    console.log('Mbappe not found in top scorers.');
    console.log('Top 10 scorers:');
    scorers.slice(0, 10).forEach(s => {
      console.log(`- ${s.player.name}: ${s.statistics[0]?.goals?.total} goals`);
    });
  }
}

main().catch(console.error);
