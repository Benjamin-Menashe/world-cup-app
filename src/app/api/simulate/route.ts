import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getSession } from "@/lib/auth"

const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const SIM_GROUP_NAME = "🧪 Simulation Group"
const SIM_INVITE_CODE = "SIMGROUP1"
const SIM_EMAIL_SUFFIX = "@sim.wc2026.test"
const SIM_PLAYER_NAME = "[SIM] Golden Boot Star"

// ── Ranking patterns (index into sorted group team array) ────────────────────
// Team ordering within each group is sorted by name alphabetically.
// team[0] always wins all 3 games, team[3] always loses all 3.
const USER_RANKING_PATTERNS = [
  [0, 1, 2, 3], // Alice  – perfect order
  [1, 0, 2, 3], // Bob    – 1st/2nd swapped
  [0, 2, 1, 3], // Carlos – 2nd/3rd swapped
  [0, 1, 3, 2], // Diana  – 3rd/4th swapped
  [3, 2, 1, 0], // Eve    – fully reversed
]

// Matchup pairs within each group: indices into the sorted 4-team array
// → team[0] plays [1],[2],[3]; team[3] plays [2],[1],[0]
const MATCHUP_PAIRS = [[0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2]]
const MATCH_SCORES = [
  { home: 2, away: 0 }, // [0] vs [1]  → [0] wins
  { home: 1, away: 0 }, // [2] vs [3]  → [2] wins
  { home: 2, away: 1 }, // [0] vs [2]  → [0] wins
  { home: 1, away: 0 }, // [1] vs [3]  → [1] wins
  { home: 3, away: 0 }, // [0] vs [3]  → [0] wins (3-0, undefeated)
  { home: 2, away: 1 }, // [1] vs [2]  → [1] wins
]
// Final group standings: [0]=1st (3W 0L), [1]=2nd (2W 1L), [2]=3rd (1W 2L), [3]=4th (0W 3L)

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const log: string[] = []

  // ══════════════════════════════════════════════════════════════════════════
  // Step 1 — Clean up any previous simulation run (Preserving Group logic natively)
  // ══════════════════════════════════════════════════════════════════════════
  const prevGroup = await prisma.group.findUnique({ where: { inviteCode: SIM_INVITE_CODE } })
  if (!prevGroup) {
    log.push("No previous Simulation Group found, will generate.")
  } else {
    log.push("♻️  Preserving Simulation Group framework.")
  }

  const prevUsers = await prisma.user.findMany({ where: { email: { endsWith: SIM_EMAIL_SUFFIX } } })
  for (const u of prevUsers) {
    await prisma.gameBet.deleteMany({ where: { userId: u.id } })
    await prisma.groupRankingBet.deleteMany({ where: { userId: u.id } })
    await prisma.championBet.deleteMany({ where: { userId: u.id } })
    await prisma.topScorerBet.deleteMany({ where: { userId: u.id } })
    await prisma.winnerLoserBet.deleteMany({ where: { userId: u.id } })
    await prisma.member.deleteMany({ where: { userId: u.id } })
    await prisma.user.delete({ where: { id: u.id } })
  }
  if (prevUsers.length) log.push(`♻️  Cleared ${prevUsers.length} previous sim users`)

  // Clear all tournament result overrides
  await prisma.tournamentResult.deleteMany()
  log.push("♻️  Cleared all Tournament Results")

  // Reset all group stage game scores
  await prisma.game.updateMany({
    where: { stage: 'Group' },
    data: { homeScore: null, awayScore: null, isFinished: false }
  })
  log.push("♻️  Reset group stage game scores")

  // Reset all player goals (from any previous sim)
  await prisma.player.updateMany({ where: { goalsScored: { gt: 0 } }, data: { goalsScored: 0 } })
  log.push("♻️  Reset player goal counts")

  // ══════════════════════════════════════════════════════════════════════════
  // Step 2 — Load teams, determine canonical "special" teams
  // ══════════════════════════════════════════════════════════════════════════
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  const allTeams = await prisma.team.findMany({ orderBy: { name: 'asc' } })

  // Build per-group sorted team arrays (sorted alphabetically by name, consistent with the bet form)
  const teamsByGroup: Record<string, typeof allTeams> = {}
  for (const g of groupLetters) {
    teamsByGroup[g] = allTeams.filter(t => t.group === g).sort((a, b) => a.name.localeCompare(b.name))
  }

  // Use group A for the "official" special picks:
  //   team[0] → 3 wins → undefeated, champion
  //   team[3] → 0 wins → winless
  const groupATeams = teamsByGroup['A']
  if (!groupATeams || groupATeams.length < 4) {
    return NextResponse.json({ error: "Group A doesn't have 4 teams — seed the database first." }, { status: 500 })
  }
  const undefeatedTeam = groupATeams[0]
  const winlessTeam    = groupATeams[3]
  const championTeam   = groupATeams[0]

  log.push(`✅ Undefeated/Champion team: ${undefeatedTeam.name} (Group A)`)
  log.push(`✅ Winless team:             ${winlessTeam.name} (Group A)`)

  // ══════════════════════════════════════════════════════════════════════════
  // Step 3 — Ensure a Golden Boot player exists for the champion team
  //          (create a sim player if the team has none in the DB)
  // ══════════════════════════════════════════════════════════════════════════
  let topScorerPlayer = await prisma.player.findFirst({
    where: { teamId: undefeatedTeam.id }
  })

  let createdSimPlayer = false
  if (!topScorerPlayer) {
    topScorerPlayer = await prisma.player.create({
      data: { name: SIM_PLAYER_NAME, teamId: undefeatedTeam.id, goalsScored: 0 }
    })
    createdSimPlayer = true
    log.push(`✅ Created sim player "${SIM_PLAYER_NAME}" for ${undefeatedTeam.name}`)
  } else {
    log.push(`✅ Using existing player "${topScorerPlayer.name}" as Golden Boot pick`)
  }

  // Pick "wrong" scorers for users who should miss (one per other group)
  // Pick the first available player from group B's first team, or create one.
  const groupBFirstTeam = teamsByGroup['B']?.[0]
  const wrongScorerPlayer = groupBFirstTeam
    ? await prisma.player.findFirst({ where: { teamId: groupBFirstTeam.id } })
    : null

  // ══════════════════════════════════════════════════════════════════════════
  // Step 4 — Create 5 sim users
  // ══════════════════════════════════════════════════════════════════════════
  const password = await bcrypt.hash("SimTest123!", 10)
  const simNames = [
    { name: "Alice (Sim)", email: `alice${SIM_EMAIL_SUFFIX}` },
    { name: "Bob (Sim)",   email: `bob${SIM_EMAIL_SUFFIX}` },
    { name: "Carlos (Sim)",email: `carlos${SIM_EMAIL_SUFFIX}` },
    { name: "Diana (Sim)", email: `diana${SIM_EMAIL_SUFFIX}` },
    { name: "Eve (Sim)",   email: `eve${SIM_EMAIL_SUFFIX}` },
  ]

  const simUsers = []
  for (const u of simNames) {
    simUsers.push(await prisma.user.create({ data: { ...u, password } }))
  }
  log.push(`✅ Created ${simUsers.length} sim users`)

  // Step 5 — Create group and add all users as members
  // ══════════════════════════════════════════════════════════════════════════
  const simGroup = await prisma.group.upsert({
    where: { inviteCode: SIM_INVITE_CODE },
    update: { name: SIM_GROUP_NAME },
    create: { name: SIM_GROUP_NAME, inviteCode: SIM_INVITE_CODE }
  })
  
  // Add sim users
  for (const u of simUsers) {
    await prisma.member.create({ data: { userId: u.id, groupId: simGroup.id } })
  }
  
  // Add current user to sim group so they can see results
  try {
    const currentUserId = await getSession()
    if (currentUserId) {
      log.push(`👤 Identified current user ID: ${currentUserId}`)
      await prisma.member.upsert({
        where: { userId_groupId: { userId: currentUserId, groupId: simGroup.id } },
        update: {},
        create: { userId: currentUserId, groupId: simGroup.id }
      })
      log.push(`✅ Added current user to ${SIM_GROUP_NAME}`)
    } else {
      log.push(`⚠️ No active session found during reset (current user not added to group)`)
    }
  } catch (err) {
    log.push(`❌ Error adding current user to group: ${err instanceof Error ? err.message : String(err)}`)
  }
  
  log.push(`✅ Created "${SIM_GROUP_NAME}" with sim members`)

  // ══════════════════════════════════════════════════════════════════════════
  // Step 6 — Create bets for each user (deterministic, varying accuracy)
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Bet accuracy per user:
  //   Alice : perfect rankings, correct champion/undefeated/winless/scorer
  //   Bob   : 1st/2nd swapped rankings, wrong champion, wrong scorer
  //   Carlos: 2nd/3rd swapped rankings, correct undefeated/winless, wrong champion
  //   Diana : 3rd/4th swapped rankings, correct champion, wrong undefeated/winless
  //   Eve   : fully reversed rankings, all specials wrong

  const groupBTeams = teamsByGroup['B'] ?? []
  const groupDTeams = teamsByGroup['D'] ?? []
  const groupLTeams = teamsByGroup['L'] ?? []

  const championPicks    = [championTeam, groupBTeams[0], groupBTeams[0],  championTeam,    groupLTeams[0]]
  const undefeatedPicks  = [undefeatedTeam, groupBTeams[0], undefeatedTeam, groupDTeams[0], groupLTeams[0]]
  const winlessPicks     = [winlessTeam,    groupBTeams[3], winlessTeam,    groupDTeams[3], groupLTeams[3]]
  const topScorerPicks   = [
    topScorerPlayer,                             // Alice  – correct
    wrongScorerPlayer ?? topScorerPlayer,        // Bob    – wrong (if we have one)
    topScorerPlayer,                             // Carlos – correct
    wrongScorerPlayer ?? topScorerPlayer,        // Diana  – wrong
    wrongScorerPlayer ?? topScorerPlayer,        // Eve    – wrong
  ]

  for (let i = 0; i < simUsers.length; i++) {
    const u = simUsers[i]
    const pattern = USER_RANKING_PATTERNS[i]

    // Group Ranking Bets — one per group
    for (const g of groupLetters) {
      const gTeams = teamsByGroup[g]
      if (!gTeams || gTeams.length < 4) continue
      const rankedIds = pattern.map(idx => gTeams[idx]?.id).filter(Boolean) as string[]
      await prisma.groupRankingBet.create({
        data: { userId: u.id, group: g, rankedTeamIds: JSON.stringify(rankedIds) }
      })
    }

    // Champion Bet
    const champ = championPicks[i]
    if (champ) await prisma.championBet.create({ data: { userId: u.id, teamId: champ.id } })

    // Top Scorer Bet
    const scorer = topScorerPicks[i]
    if (scorer) await prisma.topScorerBet.create({ data: { userId: u.id, playerId: scorer.id } })

    // Undefeated (winner) / Winless (loser) Team Bets
    const wTeam = undefeatedPicks[i]
    const lTeam = winlessPicks[i]
    if (wTeam && lTeam) {
      await prisma.winnerLoserBet.create({
        data: { userId: u.id, winnerTeamId: wTeam.id, loserTeamId: lTeam.id }
      })
    }
  }
  log.push(`✅ Created bets for all 5 sim users`)

  // ══════════════════════════════════════════════════════════════════════════
  // Step 7 — Simulate all group stage match scores
  // ══════════════════════════════════════════════════════════════════════════
  const allGroupGames = await prisma.game.findMany({
    where: { stage: 'Group' },
    include: { homeTeam: true, awayTeam: true }
  })

  let gamesUpdated = 0
  let gamesMissed = 0
  for (const g of groupLetters) {
    const gTeams = teamsByGroup[g]
    if (!gTeams || gTeams.length < 4) continue

    for (let mi = 0; mi < MATCHUP_PAIRS.length; mi++) {
      const [hi, ai] = MATCHUP_PAIRS[mi]
      const homeTeam = gTeams[hi]
      const awayTeam = gTeams[ai]
      const score = MATCH_SCORES[mi]

      // Match either orientation — the DB may store home/away in reverse
      const game = allGroupGames.find(
        gm => (gm.homeTeamId === homeTeam.id && gm.awayTeamId === awayTeam.id) ||
              (gm.homeTeamId === awayTeam.id && gm.awayTeamId === homeTeam.id)
      )
      if (!game) { gamesMissed++; continue }

      // If stored reversed, flip the score
      const flipped = game.homeTeamId === awayTeam.id
      await prisma.game.update({
        where: { id: game.id },
        data: {
          homeScore: flipped ? score.away : score.home,
          awayScore: flipped ? score.home : score.away,
          isFinished: true
        }
      })
      gamesUpdated++
    }
  }
  log.push(`✅ Updated scores for ${gamesUpdated} group stage games${gamesMissed > 0 ? ` (${gamesMissed} matchups not in DB — may be normal if games aren't seeded yet)` : ''}`)

  // ══════════════════════════════════════════════════════════════════════════
  // Step 8 — Set official TournamentResult entries
  // ══════════════════════════════════════════════════════════════════════════
  // Group rankings (team[0] is always 1st, etc.)
  for (const g of groupLetters) {
    const gTeams = teamsByGroup[g]
    if (!gTeams || gTeams.length < 4) continue
    const officialOrder = [0, 1, 2, 3].map(i => gTeams[i].id)
    await prisma.tournamentResult.upsert({
      where: { key: `Group_${g}` },
      update: { value: JSON.stringify(officialOrder) },
      create: { key: `Group_${g}`, value: JSON.stringify(officialOrder) }
    })
  }

  // Champion
  await prisma.tournamentResult.upsert({
    where: { key: 'Champion' },
    update: { value: JSON.stringify(championTeam.id) },
    create: { key: 'Champion', value: JSON.stringify(championTeam.id) }
  })
  log.push(`✅ Set TournamentResult: Champion = ${championTeam.name}`)

  // ══════════════════════════════════════════════════════════════════════════
  // Step 9 — Award Golden Boot goals to the top scorer player
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.player.update({
    where: { id: topScorerPlayer.id },
    data: { goalsScored: 5 }
  })
  log.push(`✅ Awarded 5 goals to Golden Boot player "${topScorerPlayer.name}" → 5 pts for correct picks`)

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════
  log.push("")
  log.push("🏁 Simulation complete!")
  log.push(`   Group:      ${SIM_GROUP_NAME} (invite: ${SIM_INVITE_CODE})`)
  log.push(`   Champion:   ${championTeam.name}`)
  log.push(`   Undefeated: ${undefeatedTeam.name} (Group A, 3W 0L)`)
  log.push(`   Winless:    ${winlessTeam.name} (Group A, 0W 3L)`)
  log.push(`   Top Scorer: ${topScorerPlayer.name}${createdSimPlayer ? ' (sim player)' : ''}`)
  log.push("")
  log.push("Expected leaderboard (approx):")
  log.push("   Alice  → perfect rankings + all specials correct")
  log.push("   Carlos → near-perfect + undefeated/winless correct")
  log.push("   Diana  → near-perfect + champion correct")
  log.push("   Bob    → good rankings + all specials wrong")
  log.push("   Eve    → reversed rankings + all specials wrong")

  return NextResponse.json({ success: true, log })
}
