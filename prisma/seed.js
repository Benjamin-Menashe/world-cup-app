/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
// Use native fetch
const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed with API-Sports...')
  const key = process.env.API_KEY || '1ac86921ed3c7547a38950cc81243cef';
  const headers = { 'x-apisports-key': key };

  // Fetch World Cup 2022 teams (league=1, season=2022) - 32 teams
  const wcRes = await fetch('https://v3.football.api-sports.io/teams?league=1&season=2022', { headers });
  const wcData = await wcRes.json();
  let apiTeams = wcData.response || [];

  // Fetch Euro 2024 teams (league=4, season=2024) - 24 teams
  const euroRes = await fetch('https://v3.football.api-sports.io/teams?league=4&season=2024', { headers });
  const euroData = await euroRes.json();
  const euroTeams = euroData.response || [];

  // Merge and deduplicate
  const seenIds = new Set();
  const mergedTeams = [];
  
  for (const t of [...apiTeams, ...euroTeams]) {
    if (!seenIds.has(t.team.id)) {
      seenIds.add(t.team.id);
      mergedTeams.push(t);
    }
  }

  // We need 48 teams for WC 2026 (12 groups of 4)
  // If we don't have 48, we'll fetch Copa America 2024 (league=9, season=2024)
  if (mergedTeams.length < 48) {
    const copaRes = await fetch('https://v3.football.api-sports.io/teams?league=9&season=2024', { headers });
    const copaData = await copaRes.json();
    for (const t of (copaData.response || [])) {
      if (!seenIds.has(t.team.id) && mergedTeams.length < 48) {
        seenIds.add(t.team.id);
        mergedTeams.push(t);
      }
    }
  }

  // If still less than 48, just pad with dummy
  while (mergedTeams.length < 48) {
    mergedTeams.push({
      team: { name: `Team ${mergedTeams.length + 1}`, logo: 'https://flagcdn.com/w320/un.png', id: 999000 + mergedTeams.length }
    })
  }

  // Slice exactly 48
  const final48 = mergedTeams.slice(0, 48);
  console.log(`Prepared ${final48.length} teams.`);

  // Groups A to L
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  
  // Clear existing
  await prisma.gameBet.deleteMany()
  await prisma.winnerLoserBet.deleteMany()
  await prisma.topScorerBet.deleteMany()
  await prisma.championBet.deleteMany()
  await prisma.groupRankingBet.deleteMany()
  await prisma.game.deleteMany()
  await prisma.player.deleteMany()
  await prisma.team.deleteMany()

  const createdTeams = [];
  for (let i = 0; i < final48.length; i++) {
    const apiTeam = final48[i].team;
    const group = groups[Math.floor(i / 4)];
    
    // Create team
    const team = await prisma.team.create({
      data: {
        name: apiTeam.name,
        flagUrl: apiTeam.logo,
        group: group,
        players: {
          create: [
            { name: `${apiTeam.name} Star 1` },
            { name: `${apiTeam.name} Star 2` }
          ]
        }
      }
    });
    createdTeams.push(team);
    console.log(`Created team ${team.name} in Group ${team.group}`);
  }

  // Create group stage games
  let kickoff = new Date('2026-06-11T16:00:00Z')
  for (const group of groups) {
    const groupTeams = createdTeams.filter(t => t.group === group)
    const matchups = [
      [0, 1], [2, 3],
      [0, 2], [1, 3],
      [0, 3], [1, 2]
    ]
    
    for (const match of matchups) {
      await prisma.game.create({
        data: {
          stage: 'Group',
          kickoffTime: new Date(kickoff.getTime()),
          homeTeamId: groupTeams[match[0]].id,
          awayTeamId: groupTeams[match[1]].id,
        }
      })
      kickoff.setHours(kickoff.getHours() + 3)
    }
  }

  console.log('Database seeded successfully with API data!');
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
