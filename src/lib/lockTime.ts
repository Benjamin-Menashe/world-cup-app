import prisma from "@/lib/prisma"

/**
 * Returns the "effective now" — if the admin has set a TimeOverride in TournamentResult,
 * that date is used instead of the real wall clock. This allows the admin to freeze time
 * at any tournament moment (e.g. "59 minutes before kick-off") without touching game data.
 */
export async function getEffectiveNow(): Promise<Date> {
  try {
    const override = await prisma.tournamentResult.findUnique({ where: { key: 'TimeOverride' } })
    if (override?.value) {
      const d = new Date(JSON.parse(override.value) as string)
      if (!isNaN(d.getTime())) return d
    }
  } catch {
    // silently fall through to real time
  }
  return new Date()
}

export async function getKnockoutLockOverride(): Promise<"Locked" | "Unlocked" | "Auto"> {
  try {
    const override = await prisma.tournamentResult.findUnique({ where: { key: 'KnockoutLockOverride' } })
    if (override?.value === '"Locked"') return "Locked"
    if (override?.value === '"Unlocked"') return "Unlocked"
  } catch {
    // ignore
  }
  return "Auto"
}

/**
 * Returns the group stage lock time: earliest group game kickoff minus 1 hour.
 */
export async function getGroupStageLockTime(): Promise<Date | null> {
  const first = await prisma.game.findFirst({
    where: { stage: 'Group' },
    orderBy: { kickoffTime: 'asc' },
    select: { kickoffTime: true },
  })
  if (!first) return null
  return new Date(first.kickoffTime.getTime() - 60 * 60 * 1000)
}

/** Returns true if the group stage bets are now locked (>= 1 hour before first group kickoff). */
export async function isGroupStageLocked(): Promise<boolean> {
  const lockTime = await getGroupStageLockTime()
  if (!lockTime) return false
  const now = await getEffectiveNow()
  return now >= lockTime
}

/**
 * For a given group letter, compute the final standings from finished games.
 * Sorting: wins desc → goal diff desc → goals scored desc.
 * Returns null if not all 6 games are finished yet.
 */
export async function deriveGroupStandings(
  groupLetter: string
): Promise<string[] | null> {
  const games = await prisma.game.findMany({
    where: { stage: 'Group', homeTeam: { group: groupLetter } },
    include: { homeTeam: true, awayTeam: true },
  })

  // Need exactly 6 finished games (4 teams, round-robin)
  const finished = games.filter(g => g.isFinished && g.homeScore !== null && g.awayScore !== null)
  if (finished.length < 6) return null

  // Tally records
  const record: Record<string, { wins: number; draws: number; losses: number; gf: number; ga: number }> = {}
  const ensure = (id: string) => {
    if (!record[id]) record[id] = { wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }
  }

  for (const g of finished) {
    const hs = g.homeScore!
    const as = g.awayScore!
    ensure(g.homeTeamId)
    ensure(g.awayTeamId)
    record[g.homeTeamId].gf += hs
    record[g.homeTeamId].ga += as
    record[g.awayTeamId].gf += as
    record[g.awayTeamId].ga += hs
    if (hs > as) {
      record[g.homeTeamId].wins++
      record[g.awayTeamId].losses++
    } else if (as > hs) {
      record[g.awayTeamId].wins++
      record[g.homeTeamId].losses++
    } else {
      record[g.homeTeamId].draws++
      record[g.awayTeamId].draws++
    }
  }

  return Object.entries(record)
    .sort(([, a], [, b]) => {
      const wDiff = b.wins - a.wins
      if (wDiff !== 0) return wDiff
      const gdA = a.gf - a.ga
      const gdB = b.gf - b.ga
      if (gdB !== gdA) return gdB - gdA
      return b.gf - a.gf
    })
    .map(([id]) => id)
}
