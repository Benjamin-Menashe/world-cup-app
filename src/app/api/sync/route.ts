import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { deriveGroupStandings } from "@/lib/lockTime"

const API_KEY = process.env.API_FOOTBALL_KEY || ""
const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const API_BASE = "https://v3.football.api-sports.io"

// WC 2026 league ID is 1, season 2026
const LEAGUE_ID = 1
const SEASON = 2026

interface ApiFixture {
  fixture: { id: number; status: { short: string }; date: string }
  teams: {
    home: { name: string; id: number }
    away: { name: string; id: number }
  }
  goals: { home: number | null; away: number | null }
  score: {
    fulltime: { home: number | null; away: number | null }
  }
}

interface ApiScorer {
  player: { name: string }
  statistics: Array<{ goals: { total: number | null } }>
}

export async function POST(req: NextRequest) {
  // Simple secret-based auth
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const headers = { "x-apisports-key": API_KEY }
  const summary = {
    gamesChecked: 0,
    gamesUpdated: 0,
    playersChecked: 0,
    playersUpdated: 0,
    errors: [] as string[],
  }

  try {
    // ── 1. Sync Game Scores & Dates ───────────────────────────────────────────
    const fixturesRes = await fetch(
      `${API_BASE}/fixtures?league=${LEAGUE_ID}&season=${SEASON}`,
      { headers }
    )

    if (!fixturesRes.ok) {
      summary.errors.push(`Fixtures API returned ${fixturesRes.status}`)
    } else {
      const fixturesData = await fixturesRes.json()
      const fixtures: ApiFixture[] = fixturesData.response || []
      summary.gamesChecked = fixtures.length

      // Get all games from our DB to match by team names
      const dbGames = await prisma.game.findMany({
        include: { homeTeam: true, awayTeam: true }
      })

      for (const fixture of fixtures) {
        // Match by team names (case-insensitive)
        const homeName = fixture.teams.home.name.toLowerCase()
        const awayName = fixture.teams.away.name.toLowerCase()

        const g = dbGames.find(
          (match) =>
            match.homeTeam.name.toLowerCase() === homeName &&
            match.awayTeam.name.toLowerCase() === awayName
        )

        if (g) {
          const apiKickoff = new Date(fixture.fixture.date)
          const finishedStatus = ['FT', 'AET', 'PEN']
          const isFinished = finishedStatus.includes(fixture.fixture.status.short)
          
          await prisma.game.update({
            where: { id: g.id },
            data: {
              kickoffTime: apiKickoff,
              // Use the score at the end of regular time (fulltime)
              homeScore: isFinished ? fixture.score.fulltime.home : null,
              awayScore: isFinished ? fixture.score.fulltime.away : null,
              isFinished: isFinished,
            },
          })
          summary.gamesUpdated++
        }
      }

      // ── 1b. Auto-derive and store group standings for completed groups ──────────
      const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L']
      let groupsFinalized = 0
      for (const g of groupLetters) {
        const standings = await deriveGroupStandings(g)
        if (!standings) continue
        await prisma.tournamentResult.upsert({
          where: { key: `Group_${g}` },
          update: { value: JSON.stringify(standings) },
          create: { key: `Group_${g}`, value: JSON.stringify(standings) },
        })
        groupsFinalized++
      }
      if (groupsFinalized > 0) summary.errors.push(`ℹ️ Auto-stored standings for ${groupsFinalized} completed group(s)`)
    }

    const scorersRes = await fetch(
      `${API_BASE}/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`,
      { headers }
    )

    if (!scorersRes.ok) {
      summary.errors.push(`Scorers API returned ${scorersRes.status}`)
    } else {
      const scorersData = await scorersRes.json()
      const scorers: ApiScorer[] = scorersData.response || []
      summary.playersChecked = scorers.length

      // Get all players from DB
      const dbPlayers = await prisma.player.findMany()

      for (const scorer of scorers) {
        const apiGoals = scorer.statistics[0]?.goals?.total ?? 0
        const apiName = scorer.player.name.toLowerCase()

        // Match by name (partial or full)
        const match = dbPlayers.find((p) =>
          p.name.toLowerCase().includes(apiName) ||
          apiName.includes(p.name.toLowerCase())
        )

        if (match && match.goalsScored !== apiGoals) {
          await prisma.player.update({
            where: { id: match.id },
            data: { goalsScored: apiGoals },
          })
          summary.playersUpdated++
        }
      }
    }
  } catch (err) {
    summary.errors.push((err as Error)?.message ?? "Unknown error")
  }

  return NextResponse.json({ success: true, summary })
}
