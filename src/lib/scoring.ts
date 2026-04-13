import prisma from "@/lib/prisma"
import { deriveGroupStandings, isGroupStageLocked, getEffectiveNow } from "@/lib/lockTime"

// Kendall-Tau distance for 2 arrays of the same elements
function kendallTauDistance(arr1: string[], arr2: string[]): number {
  if (arr1.length !== arr2.length) return 0
  let distance = 0
  for (let i = 0; i < arr1.length; i++) {
    for (let j = i + 1; j < arr1.length; j++) {
      const idx1 = arr2.indexOf(arr1[i])
      const idx2 = arr2.indexOf(arr1[j])
      if (idx1 > idx2) { distance++ }
    }
  }
  return distance
}

// Normalized score for n=4 (max distance = 6)
function kendallTauScore(predicted: string[], actual: string[]): number {
  const maxDistance = 6 // for 4 elements: 4*3/2
  const distance = kendallTauDistance(predicted, actual)
  return Math.max(0, maxDistance - distance) // 6 pts for perfect
}

export type PointBreakdown = {
  category: string;
  points: number;
  details?: string;
  group: 'golden_boot' | 'knockout' | 'specials' | 'group_rankings';
  stage?: string;
}

export async function calculateUserPoints(userId: string, currentUserId?: string | null): Promise<{ total: number, breakdown: PointBreakdown[] }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groupRankingBets: true,
      championBets: { include: { team: true } },
      topScorerBets: { include: { player: true } },
      winnerLoserBets: { include: { winnerTeam: true, loserTeam: true } },
      gameBets: { include: { game: { include: { homeTeam: true, awayTeam: true } } } }
    }
  })

  if (!user) return { total: 0, breakdown: [] }

  const isGroupLocked = await isGroupStageLocked()
  const canViewSpecials = isGroupLocked || userId === currentUserId

  let totalPoints = 0
  const breakdown: PointBreakdown[] = []

  const maxGoalsObj = await prisma.player.aggregate({ _max: { goalsScored: true } })
  const maxGoals = maxGoalsObj._max.goalsScored ?? 0

  // Golden Boot (each goal = 1 pt, +1 if top scorer overall)
  if (user.topScorerBets.length > 0) {
    const bet = user.topScorerBets[0]
    if (bet.player) {
      const isTopScorer = bet.player.goalsScored > 0 && bet.player.goalsScored === maxGoals
      const bonus = isTopScorer ? 1 : 0
      const pts = bet.player.goalsScored + bonus
      totalPoints += pts
      const suffix = isTopScorer ? ' (+1 Top Scorer Bonus)' : ''
      breakdown.push({
        group: 'golden_boot',
        category: 'Golden Boot',
        points: pts,
        details: canViewSpecials 
          ? `Pick: ${bet.player.name} · ${bet.player.goalsScored} goal${bet.player.goalsScored !== 1 ? 's' : ''}${suffix}` 
          : `Pick: Hidden · ${bet.player.goalsScored} goal${bet.player.goalsScored !== 1 ? 's' : ''}${suffix}`
      })
    }
  }

  // Knockout Matches
  // Exhaustive: Include ALL knockout games, finished or not.
  const allKnockouts = await prisma.game.findMany({
    where: { stage: { not: 'Group' } },
    orderBy: { kickoffTime: 'asc' },
    include: { homeTeam: true, awayTeam: true }
  })

  // Determine effective "now" once for all per-match lock checks
  const effectiveNow = await getEffectiveNow()

  for (const game of allKnockouts) {
    const bet = user.gameBets.find(b => b.gameId === game.id)
    const betHome = bet ? bet.homeScore : 0
    const betAway = bet ? bet.awayScore : 0
    
    let gamePoints = 0
    const lockTime = new Date(game.kickoffTime.getTime() - 60 * 60 * 1000)
    const isMatchLocked = effectiveNow >= lockTime
    const canViewMatch = isMatchLocked || userId === currentUserId
    
    const homeAbbr = game.homeTeam.name.substring(0, 3).toUpperCase()
    const awayAbbr = game.awayTeam.name.substring(0, 3).toUpperCase()
    
    let details = canViewMatch ? `Predicted: ${homeAbbr} ${betHome} - ${betAway} ${awayAbbr} · Actual: TBD` : `Predicted: Hidden · Actual: TBD`

    if (game.isFinished && game.homeScore !== null && game.awayScore !== null) {
      const actualDiff = game.homeScore - game.awayScore
      const betDiff = betHome - betAway
      const actualDir = actualDiff > 0 ? 1 : actualDiff < 0 ? -1 : 0
      const betDir = betDiff > 0 ? 1 : betDiff < 0 ? -1 : 0
      
      if (actualDir === betDir) gamePoints += 2
      if (betHome === game.homeScore) gamePoints += 1
      if (betAway === game.awayScore) gamePoints += 1
      if (game.stage === 'Final') gamePoints *= 2
      
      totalPoints += gamePoints
      details = `Predicted: ${homeAbbr} ${betHome} - ${betAway} ${awayAbbr} · Actual: ${homeAbbr} ${game.homeScore} - ${game.awayScore} ${awayAbbr}${game.stage === 'Final' ? ' · ×2 Final' : ''}`
    }

    breakdown.push({
      group: 'knockout',
      stage: game.stage,
      category: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
      points: gamePoints,
      details
    })
  }

  // Official Tournament Results Points
  const results = await prisma.tournamentResult.findMany()
  const resultMap = results.reduce((acc, curr) => {
    try { acc[curr.key] = JSON.parse(curr.value) } 
    catch { acc[curr.key] = curr.value }
    return acc
  }, {} as Record<string, unknown>)

  // Auto-derive WinnerTeam (3 wins) and LoserTeam (3 losses) from finished group games
  const finishedGroupGames = await prisma.game.findMany({
    where: { stage: 'Group', isFinished: true }
  })

  const teamRecord: Record<string, { wins: number, losses: number }> = {}
  for (const game of finishedGroupGames) {
    if (game.homeScore === null || game.awayScore === null) continue
    if (!teamRecord[game.homeTeamId]) teamRecord[game.homeTeamId] = { wins: 0, losses: 0 }
    if (!teamRecord[game.awayTeamId]) teamRecord[game.awayTeamId] = { wins: 0, losses: 0 }
    if (game.homeScore > game.awayScore) {
      teamRecord[game.homeTeamId].wins++
      teamRecord[game.awayTeamId].losses++
    } else if (game.awayScore > game.homeScore) {
      teamRecord[game.awayTeamId].wins++
      teamRecord[game.homeTeamId].losses++
    }
  }

  // Undefeated / Winless: use admin override if set, otherwise auto-derive from game records.
  // Overrides are stored as arrays of team IDs (to support multiple undefeated/winless teams).
  const overrideUndefeated = resultMap['Undefeated']
  const overrideWinless    = resultMap['Winless']

  const undefeatedTeamIds: Set<string> = Array.isArray(overrideUndefeated)
    ? new Set(overrideUndefeated as string[])
    : new Set(Object.entries(teamRecord).filter(([, r]) => r.wins === 3 && r.losses === 0).map(([id]) => id))

  const winlessTeamIds: Set<string> = Array.isArray(overrideWinless)
    ? new Set(overrideWinless as string[])
    : new Set(Object.entries(teamRecord).filter(([, r]) => r.losses === 3 && r.wins === 0).map(([id]) => id))

  const groupGamesCount = await prisma.game.count({ where: { stage: 'Group' } })
  const allGroupsFinished = finishedGroupGames.length >= groupGamesCount && groupGamesCount > 0


  // Champion
  if (user.championBets.length > 0) {
    const bet = user.championBets[0]
    if (resultMap["Champion"] === bet.teamId) {
      totalPoints += 8
      breakdown.push({ group: 'specials', category: 'Tournament Champion', points: 8, details: canViewSpecials ? `Pick: ${bet.team.name} ✓` : 'Pick: Hidden ✓' })
    } else if (resultMap["Champion"]) {
      breakdown.push({ group: 'specials', category: 'Tournament Champion', points: 0, details: canViewSpecials ? `Pick: ${bet.team.name} ✗` : 'Pick: Hidden ✗' })
    } else {
      breakdown.push({ group: 'specials', category: 'Tournament Champion', points: 0, details: canViewSpecials ? `Pick: ${bet.team.name} (TBD)` : 'Pick: Hidden (TBD)' })
    }
  }

  // Undefeated teams
  if (user.winnerLoserBets.length > 0) {
    const bet = user.winnerLoserBets[0]
    if (undefeatedTeamIds.has(bet.winnerTeamId)) {
      totalPoints += 3
      breakdown.push({ group: 'specials', category: 'Undefeated Team', points: 3, details: canViewSpecials ? `Pick: ${bet.winnerTeam.name} ✓` : 'Pick: Hidden ✓' })
    } else if (allGroupsFinished) {
      breakdown.push({ group: 'specials', category: 'Undefeated Team', points: 0, details: canViewSpecials ? `Pick: ${bet.winnerTeam.name} ✗` : 'Pick: Hidden ✗' })
    } else {
      breakdown.push({ group: 'specials', category: 'Undefeated Team', points: 0, details: canViewSpecials ? `Pick: ${bet.winnerTeam.name} (TBD)` : 'Pick: Hidden (TBD)' })
    }
  }

  // Winless teams
  if (user.winnerLoserBets.length > 0) {
    const bet = user.winnerLoserBets[0]
    if (winlessTeamIds.has(bet.loserTeamId)) {
      totalPoints += 3
      breakdown.push({ group: 'specials', category: 'Winless Team', points: 3, details: canViewSpecials ? `Pick: ${bet.loserTeam.name} ✓` : 'Pick: Hidden ✓' })
    } else if (allGroupsFinished) {
      breakdown.push({ group: 'specials', category: 'Winless Team', points: 0, details: canViewSpecials ? `Pick: ${bet.loserTeam.name} ✗` : 'Pick: Hidden ✗' })
    } else {
      breakdown.push({ group: 'specials', category: 'Winless Team', points: 0, details: canViewSpecials ? `Pick: ${bet.loserTeam.name} (TBD)` : 'Pick: Hidden (TBD)' })
    }
  }

  // Group Rankings
  const globalTeams = await prisma.team.findMany()
  const teamNameMap = Object.fromEntries(globalTeams.map(t => [t.id, t.name.substring(0, 3).toUpperCase()]))

  const groupsAlphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
  for (const groupLetter of groupsAlphabet) {
    const bet = user.groupRankingBets.find(b => b.group === groupLetter)
    if (!bet) continue

    let actualRanking: string[] | null = null
    if (resultMap[`Group_${groupLetter}`] && Array.isArray(resultMap[`Group_${groupLetter}`])) {
      actualRanking = resultMap[`Group_${groupLetter}`] as string[]
    } else {
      actualRanking = await deriveGroupStandings(groupLetter)
    }

    try {
      const predicted = JSON.parse(bet.rankedTeamIds) as string[]
      const pts = actualRanking ? kendallTauScore(predicted, actualRanking) : 0
      
      const predString = canViewSpecials ? predicted.map(id => teamNameMap[id] ?? id).join(', ') : 'Hidden'
      let details = `Predicted: ${predString}`
      
      if (actualRanking) {
        totalPoints += pts
        const actString = actualRanking.map(id => teamNameMap[id] ?? id).join(', ')
        details += ` · Actual: ${actString}`
      } else {
        details += ` · Actual: TBD`
      }
      
      breakdown.push({ group: 'group_rankings', category: `Group ${groupLetter}`, points: pts, details })
    } catch {}
  }

  return { total: totalPoints, breakdown }
}

export async function getUserRankingsInGroup(groupId: string, currentUserId?: string | null) {
  const members = await prisma.member.findMany({
    where: { groupId },
    include: { 
      user: {
        include: {
          championBets: { include: { team: true } },
          topScorerBets: { include: { player: true } }
        }
      } 
    }
  })

  // Determine global visibility
  const locked = await isGroupStageLocked()

  const results = await Promise.all(members.map(async (m) => {
    const result = await calculateUserPoints(m.userId, currentUserId)
    const canViewSpecials = locked || m.userId === currentUserId
    
    return {
      userId: m.userId,
      name: m.user.name,
      points: result.total,
      championName: canViewSpecials ? (m.user.championBets[0]?.team.name ?? null) : 'Hidden',
      goldenBootName: canViewSpecials ? (m.user.topScorerBets[0]?.player.name ?? null) : 'Hidden',
    }
  }))

  results.sort((a, b) => b.points - a.points)

  // Compute tied ranks: same points = same rank (1, 2, 2, 4 pattern)
  const ranked = results.map(r => ({ ...r, rank: 1 }))
  for (let i = 1; i < ranked.length; i++) {
    ranked[i].rank = ranked[i].points === ranked[i - 1].points
      ? ranked[i - 1].rank
      : i + 1
  }
  
  return ranked
}
