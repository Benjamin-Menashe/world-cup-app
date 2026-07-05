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

function normalizeName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "") // remove special chars like punctuation/periods
    .trim();
}

function playerNamesMatch(dbName, apiName) {
  const normDb = normalizeName(dbName);
  const normApi = normalizeName(apiName);

  if (normDb === normApi) return true;

  // Split into parts
  const dbParts = normDb.split(/\s+/).filter(Boolean);
  const apiParts = normApi.split(/\s+/).filter(Boolean);

  if (dbParts.length === 0 || apiParts.length === 0) return false;

  // Case 1: One of the names is just a single word (e.g. "Mbappe" or "Vinicius")
  // Check if it matches the last name or first name of the other
  if (dbParts.length === 1) {
    return apiParts.includes(dbParts[0]);
  }
  if (apiParts.length === 1) {
    return dbParts.includes(apiParts[0]);
  }

  // Case 2: Initials + Last name matching, e.g. "K. Mbappe" vs "Kylian Mbappe"
  // apiParts could be ["k", "mbappe"]
  // dbParts could be ["kylian", "mbappe"] or ["kylian", "mbappe", "lottin"]
  // Let's check if the last word of apiParts matches any of the dbParts (ideally the last one)
  const lastApiWord = apiParts[apiParts.length - 1];
  const lastDbWord = dbParts[dbParts.length - 1];

  // If last names match, check initials
  if (lastApiWord === lastDbWord) {
    // Check if first parts match or are initials
    const firstApi = apiParts[0];
    const firstDb = dbParts[0];
    if (firstApi === firstDb) return true;
    if (firstApi.length === 1 && firstDb.startsWith(firstApi)) return true;
    if (firstDb.length === 1 && firstApi.startsWith(firstDb)) return true;
  }

  // Fallback: Check if one name contains all words of the other name in some form
  // e.g. "vinicius junior" vs "vinicius de oliveira junior"
  const allApiInDb = apiParts.every(part => 
    dbParts.some(dbPart => dbPart === part || (part.length === 1 && dbPart.startsWith(part)))
  );
  if (allApiInDb) return true;

  const allDbInApi = dbParts.every(part => 
    apiParts.some(apiPart => apiPart === part || (part.length === 1 && apiPart.startsWith(part)))
  );
  if (allDbInApi) return true;

  return false;
}

async function main() {
  const dbPlayers = await prisma.player.findMany({
    include: { team: true }
  });

  const scorersRes = await fetch(`${API_BASE}/players/topscorers?league=1&season=2026`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  const scorersData = await scorersRes.json();
  const scorers = scorersData.response || [];

  console.log('Testing playerNamesMatch function against top scorers:');
  let matchedCount = 0;
  for (const scorer of scorers) {
    const apiName = scorer.player.name;
    const apiGoals = scorer.statistics[0]?.goals?.total ?? 0;
    
    // Find match using the custom function
    const matches = dbPlayers.filter(p => playerNamesMatch(p.name, apiName));
    
    if (matches.length === 1) {
      const match = matches[0];
      matchedCount++;
      console.log(`✅ API: "${apiName}" -> DB: "${match.name}" (Team: ${match.team.name})`);
    } else if (matches.length > 1) {
      console.log(`⚠️ AMBIGUOUS: API "${apiName}" matched multiple DB players:`, matches.map(p => `"${p.name}" (${p.team.name})`));
    } else {
      console.log(`❌ UNMATCHED: API "${apiName}" could not be matched to any player.`);
    }
  }
  console.log(`Matched ${matchedCount} / ${scorers.length} top scorers.`);

  await prisma.$disconnect();
}

main().catch(console.error);
