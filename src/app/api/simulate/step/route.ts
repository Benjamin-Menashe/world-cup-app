import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { deriveGroupStandings } from "@/lib/lockTime"

const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const SIM_EMAIL_SUFFIX = "@sim.wc2026.test"
const SIM_INVITE_CODE = "SIMGROUP1"

// Knockout stage configurations
const KNOCKOUT_STAGES = ['R32', 'R16', 'QF', 'SF', 'Final'] as const
const STAGE_GAME_COUNTS: Record<string, number> = {
  R32: 16, R16: 8, QF: 4, SF: 2, Final: 1
}

// Minutes offset from "now" for different scenarios
function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000)
}
function minutesFromNow(m: number): Date {
  return new Date(Date.now() + m * 60 * 1000)
}

async function getSimUsers() {
  return prisma.user.findMany({ where: { email: { endsWith: SIM_EMAIL_SUFFIX } } })
}

async function getSimGroup() {
  return prisma.group.findUnique({ where: { inviteCode: SIM_INVITE_CODE } })
}

/**
 * Ensure knockout games exist for a stage with the correct team pairings.
 * Uses the top teams from group standings when available.
 * Returns the created/existing games.
 */
async function ensureKnockoutGames(stage: string, count: number, kickoffBase: Date): Promise<string[]> {
  const existing = await prisma.game.findMany({ where: { stage }, orderBy: { kickoffTime: 'asc' } })
  if (existing.length >= count) {
    // Update kickoff times to new base
    for (let i = 0; i < existing.length; i++) {
      await prisma.game.update({
        where: { id: existing[i].id },
        data: { kickoffTime: new Date(kickoffBase.getTime() + i * 3 * 60 * 60 * 1000) }
      })
    }
    return existing.map(g => g.id)
  }

  // Need to create them — pick representative teams
  const allTeams = await prisma.team.findMany({ orderBy: { name: 'asc' } })

  // For R32: use group winners and runners-up from our simulated groups
  // For later rounds: use the first available teams as placeholders
  const gameIds: string[] = []
  const usedTeamPairs: Array<[string, string]> = []

  if (stage === 'R32') {
    // Build bracket from group results: 1A vs 2B, 1C vs 2D, etc.
    const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L']
    const groupStandings: Record<string, string[]> = {}
    for (const g of groupLetters) {
      const standings = await deriveGroupStandings(g)
      if (standings && standings.length >= 2) groupStandings[g] = standings
    }

    // WC2026 bracket: 12 groups, top 2 from each + 8 best 3rd-place = 32 teams
    // Matches 1-6: 1A vs 2B, 1C vs 2D, 1E vs 2F, 1G vs 2H, 1I vs 2J, 1K vs 2L
    // Matches 7-12: 2A vs 1B, 2C vs 1D, 2E vs 1F, 2G vs 1H, 2I vs 1J, 2K vs 1L
    // Matches 13-16: 3A vs 3B, 3C vs 3D, 3E vs 3F, 3G vs 3H
    const uniquePairs: Array<[string, number, string, number]> = [
      ['A', 0, 'B', 1], ['C', 0, 'D', 1], ['E', 0, 'F', 1], ['G', 0, 'H', 1],
      ['I', 0, 'J', 1], ['K', 0, 'L', 1],
      ['B', 0, 'A', 1], ['D', 0, 'C', 1], ['F', 0, 'E', 1], ['H', 0, 'G', 1],
      ['J', 0, 'I', 1], ['L', 0, 'K', 1],
      ['A', 2, 'B', 2], ['C', 2, 'D', 2], ['E', 2, 'F', 2], ['G', 2, 'H', 2]
    ]

    for (let i = 0; i < Math.min(count, uniquePairs.length); i++) {
      const [g1, r1, g2, r2] = uniquePairs[i]
      const homeId = groupStandings[g1]?.[r1] ?? allTeams[i * 2]?.id
      const awayId = groupStandings[g2]?.[r2] ?? allTeams[i * 2 + 1]?.id
      if (!homeId || !awayId) continue
      usedTeamPairs.push([homeId, awayId])
    }
  } else {
    // For later rounds, use winners from previous round (just use sequential team pairs)
    const prevStageGames = await prisma.game.findMany({
      where: { stage: KNOCKOUT_STAGES[KNOCKOUT_STAGES.indexOf(stage as "R16" | "QF" | "SF" | "Final") - 1] },
      orderBy: { kickoffTime: 'asc' }
    })
    // Winners of games from prev stage become teams in this stage
    for (let i = 0; i < prevStageGames.length; i += 2) {
      const g1 = prevStageGames[i]
      const g2 = prevStageGames[i + 1]
      if (!g1 || !g2) break
      
      // Determine winner (random if drawn)
      const winner1 = (g1.homeScore ?? 0) > (g1.awayScore ?? 0) ? g1.homeTeamId : ((g1.awayScore ?? 0) > (g1.homeScore ?? 0) ? g1.awayTeamId : (Math.random() > 0.5 ? g1.homeTeamId : g1.awayTeamId))
      const winner2 = (g2.homeScore ?? 0) > (g2.awayScore ?? 0) ? g2.homeTeamId : ((g2.awayScore ?? 0) > (g2.homeScore ?? 0) ? g2.awayTeamId : (Math.random() > 0.5 ? g2.homeTeamId : g2.awayTeamId))
      
      usedTeamPairs.push([winner1, winner2])
    }
  }

  // Delete any partial existing games for this stage
  await prisma.gameBet.deleteMany({ where: { game: { stage } } })
  await prisma.game.deleteMany({ where: { stage } })

  for (let i = 0; i < usedTeamPairs.length; i++) {
    const [homeId, awayId] = usedTeamPairs[i]
    const kickoff = new Date(kickoffBase.getTime() + i * 3 * 60 * 60 * 1000)
    const g = await prisma.game.create({
      data: { stage, kickoffTime: kickoff, homeTeamId: homeId, awayTeamId: awayId }
    })
    gameIds.push(g.id)
  }
  return gameIds
}

/**
 * Create gameBets for all sim users on the given game IDs.
 * Deterministic scores: Alice (and Admin) bet 2-1 (home wins), others vary slightly.
 */
async function createSimBetsForGames(gameIds: string[], adminId?: string) {
  const simUsers = await getSimUsers()
  const betPatterns = [
    { home: 2, away: 1 }, // Alice  – home wins (correct match our sim)
    { home: 1, away: 2 }, // Bob    – away wins (wrong direction)
    { home: 2, away: 1 }, // Carlos – home wins (correct)
    { home: 1, away: 1 }, // Diana  – draw (wrong direction)
    { home: 0, away: 2 }, // Eve    – away wins (wrong)
  ]
  
  
  
  for (const gameId of gameIds) {
    // Admin bet (Alice's pattern)
    if (adminId) {
      await prisma.gameBet.upsert({
        where: { userId_gameId: { userId: adminId, gameId } },
        update: { homeScore: 2, awayScore: 1 },
        create: { userId: adminId, gameId, homeScore: 2, awayScore: 1 }
      })
    }

    for (let i = 0; i < simUsers.length; i++) {
      const u = simUsers[i]
      const bet = betPatterns[i % betPatterns.length]
      await prisma.gameBet.upsert({
        where: { userId_gameId: { userId: u.id, gameId } },
        update: { homeScore: bet.home, awayScore: bet.away },
        create: { userId: u.id, gameId, homeScore: bet.home, awayScore: bet.away }
      })
    }
  }
}

/**
 * Finish games: randomly score. Tie break effectively if needed for brackets.
 */
async function finishGames(gameIds: string[]) {
  for (const id of gameIds) {
    const home = Math.floor(Math.random() * 4)
    const away = Math.floor(Math.random() * 4)
    
    const game = await prisma.game.update({
      where: { id },
      data: { homeScore: home, awayScore: away, isFinished: true },
      include: { homeTeam: { include: { players: true } }, awayTeam: { include: { players: true } } }
    })

    if (home > 0 && game.homeTeam.players.length > 0) {
      const p = game.homeTeam.players[Math.floor(Math.random() * game.homeTeam.players.length)]
      await prisma.player.update({ where: { id: p.id }, data: { goalsScored: { increment: home } } })
    }
    if (away > 0 && game.awayTeam.players.length > 0) {
      const p = game.awayTeam.players[Math.floor(Math.random() * game.awayTeam.players.length)]
      await prisma.player.update({ where: { id: p.id }, data: { goalsScored: { increment: away } } })
    }
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { step, adminId } = await req.json() as { step: number, adminId?: string }
  const log: string[] = []

  // Always ensure admin is in the sim group
  const simGroup = await getSimGroup()
  if (simGroup && adminId) {
    await prisma.member.upsert({
      where: { userId_groupId: { userId: adminId, groupId: simGroup.id } },
      update: {},
      create: { userId: adminId, groupId: simGroup.id }
    })
    log.push(`✅ Admin added to ${simGroup.name}`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 0: Pre-tournament (all bets open, no points, no matches)
  // ──────────────────────────────────────────────────────────────────────────
  if (step === 0) {
    await prisma.tournamentResult.deleteMany()
    await prisma.player.updateMany({ data: { goalsScored: 0 } })
    await prisma.gameBet.deleteMany({ where: { game: { stage: { not: 'Group' } } } })
    await prisma.game.deleteMany({ where: { stage: { not: 'Group' } } })
    
    const groupGames = await prisma.game.findMany({ where: { stage: 'Group' }, orderBy: { kickoffTime: 'asc' } })
    for (const g of groupGames) {
      await prisma.game.update({
        where: { id: g.id },
        data: { kickoffTime: hoursFromNow(240), homeScore: null, awayScore: null, isFinished: false }
      })
    }
    log.push(`✅ Step 0: All matches reset to future (10 days). All results and knockout games cleared.`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: 59 min before first group match (group locked, no points)
  // ──────────────────────────────────────────────────────────────────────────
  else if (step === 1) {
    const groupGames = await prisma.game.findMany({ where: { stage: 'Group' }, orderBy: { kickoffTime: 'asc' } })
    if (groupGames.length === 0) return NextResponse.json({ error: "No group games." }, { status: 400 })
    
    for (let i = 0; i < groupGames.length; i++) {
      await prisma.game.update({
        where: { id: groupGames[i].id },
        data: { kickoffTime: new Date(minutesFromNow(59).getTime() + i * 3 * 60 * 60 * 1000) }
      })
    }
    log.push(`✅ Step 1: First group match kicks off in 59m. Bets are locked.`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: 1 min after group stage is done (Group scored. R32 open).
  // ──────────────────────────────────────────────────────────────────────────
  else if (step === 2) {
    const groupGames = await prisma.game.findMany({ where: { stage: 'Group' }, include: { homeTeam: { include: { players: true } }, awayTeam: { include: { players: true } } }, orderBy: { kickoffTime: 'asc' } })
    for (let i = 0; i < groupGames.length; i++) {
      const home = Math.floor(Math.random() * 4)
      const away = Math.floor(Math.random() * 4)
      await prisma.game.update({
        where: { id: groupGames[i].id },
        data: { kickoffTime: hoursFromNow(-(groupGames.length - i)), homeScore: home, awayScore: away, isFinished: true }
      })

      if (home > 0 && groupGames[i].homeTeam.players.length > 0) {
        const p = groupGames[i].homeTeam.players[Math.floor(Math.random() * groupGames[i].homeTeam.players.length)]
        await prisma.player.update({ where: { id: p.id }, data: { goalsScored: { increment: home } } })
      }
      if (away > 0 && groupGames[i].awayTeam.players.length > 0) {
        const p = groupGames[i].awayTeam.players[Math.floor(Math.random() * groupGames[i].awayTeam.players.length)]
        await prisma.player.update({ where: { id: p.id }, data: { goalsScored: { increment: away } } })
      }
    }

    const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L']
    for (const g of groupLetters) {
      const standings = await deriveGroupStandings(g)
      if (standings) {
        await prisma.tournamentResult.upsert({
          where: { key: `Group_${g}` },
          update: { value: JSON.stringify(standings) },
          create: { key: `Group_${g}`, value: JSON.stringify(standings) }
        })
      }
    }

    // Set Winner/Loser Bonus
    const groupAStandings = await deriveGroupStandings('A')
    if (groupAStandings && groupAStandings.length >= 4) {
      const undefeated = groupAStandings[0]
      const winless = groupAStandings[groupAStandings.length - 1]
      await prisma.tournamentResult.upsert({ where: { key: 'Undefeated' }, update: { value: JSON.stringify(undefeated) }, create: { key: 'Undefeated', value: JSON.stringify(undefeated) }})
      await prisma.tournamentResult.upsert({ where: { key: 'Winless' }, update: { value: JSON.stringify(winless) }, create: { key: 'Winless', value: JSON.stringify(winless) }})
    }

    // Add Golden Boot Player
    const simPlayer = await prisma.player.findFirst({ where: { name: "[SIM] Golden Boot Star" } })
    if (simPlayer) {
      await prisma.player.update({ where: { id: simPlayer.id }, data: { goalsScored: 10 } })
    }

    const r32Ids = await ensureKnockoutGames('R32', 16, hoursFromNow(240))
    await createSimBetsForGames(r32Ids, adminId)
    log.push(`✅ Step 2: Group games finished. Bonus awarded. R32 generated 10 days out.`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: 59 min before 1st R32 match
  // ──────────────────────────────────────────────────────────────────────────
  else if (step === 3) {
    const r32Games = await prisma.game.findMany({ where: { stage: 'R32' }, orderBy: { kickoffTime: 'asc' } })
    for (let i = 0; i < r32Games.length; i++) {
      await prisma.game.update({
        where: { id: r32Games[i].id },
        data: { kickoffTime: new Date(minutesFromNow(59).getTime() + i * 3 * 60 * 60 * 1000) }
      })
    }
    log.push(`✅ Step 3: First R32 game 59m away. R32 locked.`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: 1 min after 1st R32 match
  // ──────────────────────────────────────────────────────────────────────────
  else if (step === 4) {
    const r32Games = await prisma.game.findMany({ where: { stage: 'R32' }, orderBy: { kickoffTime: 'asc' } })
    const home = Math.floor(Math.random() * 4) + 1
    const away = Math.floor(Math.random() * 4)
    await prisma.game.update({
      where: { id: r32Games[0].id },
      data: { kickoffTime: minutesFromNow(-91), homeScore: home, awayScore: away, isFinished: true }
    })
    log.push(`✅ Step 4: First R32 match finished (${home}-${away}). Points awarded.`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 5: 1 min after last R32 match (R32 done, R16 open)
  // ──────────────────────────────────────────────────────────────────────────
  else if (step === 5) {
    const r32Games = await prisma.game.findMany({ where: { stage: 'R32' }, orderBy: { kickoffTime: 'asc' } })
    for (let i = 0; i < r32Games.length; i++) {
      const home = Math.floor(Math.random() * 4)
      const away = Math.floor(Math.random() * 4)
      await prisma.game.update({
        where: { id: r32Games[i].id },
        data: { kickoffTime: hoursFromNow(-(r32Games.length - i)), homeScore: home, awayScore: away, isFinished: true }
      })
    }
    const r16Ids = await ensureKnockoutGames('R16', 8, hoursFromNow(240))
    await createSimBetsForGames(r16Ids, adminId)
    log.push(`✅ Step 5: All R32 finished. R16 generated.`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 6: 1 min after semi-finals (R16, QF, SF done. Final open)
  // ──────────────────────────────────────────────────────────────────────────
  else if (step === 6) {
    for (const stage of ['R16', 'QF', 'SF'] as const) {
      const count = STAGE_GAME_COUNTS[stage]
      const games = await ensureKnockoutGames(stage, count, hoursFromNow(-72))
      await createSimBetsForGames(games, adminId)
      await finishGames(games)
    }
    const finalGames = await ensureKnockoutGames('Final', 1, hoursFromNow(240))
    await createSimBetsForGames(finalGames, adminId)
    log.push(`✅ Step 6: R16, QF, SF finished. Final generated.`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 7: 59 mins before Final
  // ──────────────────────────────────────────────────────────────────────────
  else if (step === 7) {
    const finalGames = await prisma.game.findMany({ where: { stage: 'Final' } })
    for (const g of finalGames) {
      await prisma.game.update({
        where: { id: g.id },
        data: { kickoffTime: minutesFromNow(59) }
      })
    }
    log.push(`✅ Step 7: Final in 59m. Locked.`)
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 8: 1 min after Final
  // ──────────────────────────────────────────────────────────────────────────
  else if (step === 8) {
    const finalGames = await prisma.game.findMany({ where: { stage: 'Final' } })
    for (const g of finalGames) {
      const home = Math.floor(Math.random() * 4) + 1
      const away = Math.floor(Math.random() * 4)
      await prisma.game.update({
        where: { id: g.id },
        data: { kickoffTime: minutesFromNow(-91), homeScore: home, awayScore: away, isFinished: true }
      })
      await prisma.tournamentResult.upsert({
        where: { key: 'Champion' },
        update: { value: JSON.stringify(home > away ? g.homeTeamId : g.awayTeamId) },
        create: { key: 'Champion', value: JSON.stringify(home > away ? g.homeTeamId : g.awayTeamId) }
      })
    }
    log.push(`✅ Step 8: Final finished. Champion set. All points awarded!`)
  }

  else {
    return NextResponse.json({ error: `Unknown step: ${step}` }, { status: 400 })
  }

  return NextResponse.json({ success: true, step, log })
}
