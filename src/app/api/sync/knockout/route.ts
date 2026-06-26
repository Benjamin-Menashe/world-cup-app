import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { teamNamesMatch } from "@/lib/teams"

const API_KEY = process.env.API_FOOTBALL_KEY || ""
const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const API_BASE = "https://v3.football.api-sports.io"
const LEAGUE_ID = 1
const SEASON = 2026

interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } }
  league: { round: string }
  teams: {
    home: { name: string; id: number; logo: string }
    away: { name: string; id: number; logo: string }
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const headers = { "x-apisports-key": API_KEY }
  const summary = {
    gamesAdded: 0,
    gamesSkipped: 0,
    errors: [] as string[]
  }

  try {
    const res = await fetch(`${API_BASE}/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, { headers })
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch fixtures" }, { status: 500 })
    }
    const data = await res.json()
    const fixtures: ApiFixture[] = data.response || []

    const knockoutFixtures = fixtures.filter(f => {
      if (!f.league?.round) return false
      const r = f.league.round.toLowerCase()
      return (
        r.includes("16") ||
        r.includes("32") ||
        r.includes("quarter") ||
        r.includes("semi") ||
        r.includes("3rd") ||
        r.includes("third") ||
        r.includes("final")
      )
    })

    const dbTeams = await prisma.team.findMany()

    for (const f of knockoutFixtures) {
      const hName = f.teams?.home?.name
      const aName = f.teams?.away?.name

      const dbHome = hName ? dbTeams.find(t => teamNamesMatch(t.name, hName)) : undefined
      const dbAway = aName ? dbTeams.find(t => teamNamesMatch(t.name, aName)) : undefined

      // Log when teams aren't found (they'll be TBD)
      if (!dbHome) summary.errors.push(`Home team not found: "${hName}" — will be TBD`)
      if (!dbAway) summary.errors.push(`Away team not found: "${aName}" — will be TBD`)

      let stage = "R16"
      const r = f.league.round.toLowerCase()
      if (r.includes("32")) stage = "R32"
      else if (r.includes("16")) stage = "R16"
      else if (r.includes("quarter")) stage = "QF"
      else if (r.includes("semi")) stage = "SF"
      else if (r.includes("3rd") || r.includes("third")) stage = "3rd"
      else if (r.includes("final")) stage = "Final"

      const kickoffTime = new Date(f.fixture.date)

      // Dedup: match by stage + kickoff time (since team IDs can be null for TBD games)
      // Also check by exact team matchup if both teams are known
      let existing = null
      if (dbHome && dbAway) {
        existing = await prisma.game.findFirst({
          where: { homeTeamId: dbHome.id, awayTeamId: dbAway.id, stage }
        })
      }
      if (!existing) {
        existing = await prisma.game.findFirst({
          where: { stage, kickoffTime }
        })
      }

      if (existing) {
        // If teams became known, update the existing TBD game
        let needsUpdate = false
        const updateData: { homeTeamId?: string; awayTeamId?: string } = {}
        if (dbHome && !existing.homeTeamId) { updateData.homeTeamId = dbHome.id; needsUpdate = true }
        if (dbAway && !existing.awayTeamId) { updateData.awayTeamId = dbAway.id; needsUpdate = true }
        if (needsUpdate) {
          await prisma.game.update({ where: { id: existing.id }, data: updateData })
          summary.errors.push(`Updated TBD teams for ${stage} game at ${kickoffTime.toISOString()}`)
        }
        summary.gamesSkipped++
        continue
      }

      await prisma.game.create({
        data: {
          homeTeamId: dbHome?.id ?? null,
          awayTeamId: dbAway?.id ?? null,
          stage,
          kickoffTime,
          isFinished: false,
        }
      })
      summary.gamesAdded++
    }
  } catch (err) {
    summary.errors.push((err as Error)?.message ?? "Unknown error")
  }

  return NextResponse.json({ success: true, summary })
}
