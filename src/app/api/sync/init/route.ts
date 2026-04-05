import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const API_KEY = process.env.API_FOOTBALL_KEY || ""
const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const API_BASE = "https://v3.football.api-sports.io"
const LEAGUE_ID = 1 // World Cup
const SEASON = 2026

interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } }
  league: { round: string } // e.g. "Group A - 1", "Round of 32"
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
    teamsAdded: 0,
    gamesAdded: 0,
    errors: [] as string[],
  }

  try {
    // Fetch all fixtures for the World Cup 2026
    const res = await fetch(`${API_BASE}/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, { headers })
    if (!res.ok) {
      summary.errors.push(`Fixtures API returned ${res.status}`)
      return NextResponse.json({ success: false, error: `API Error: ${res.status}`, summary })
    }

    const data = await res.json()
    const fixtures: ApiFixture[] = data.response || []

    if (fixtures.length === 0) {
      return NextResponse.json({ success: false, error: "No fixtures found for League 1 Season 2026.", summary })
    }

    const uniqueTeams = new Map<string, { name: string, logo: string, group: string }>()

    // Phase 1: Extract Teams
    for (const f of fixtures) {
      // Determine group from round string ("Group A - 1" -> "A")
      let matchGroup = "TBD"
      if (f.league.round && f.league.round.includes("Group")) {
        const parts = f.league.round.split(" ") // ["Group", "A", "-", "1"]
        if (parts.length >= 2) {
          matchGroup = parts[1] // "A"
        }
      }

      const hTeam = f.teams.home
      const aTeam = f.teams.away

      // Some data might be empty strings or TBD if draw isn't complete, we insert them anyway as placeholders
      if (hTeam && hTeam.name) {
        if (!uniqueTeams.has(hTeam.name) && matchGroup !== "TBD") uniqueTeams.set(hTeam.name, { name: hTeam.name, logo: hTeam.logo, group: matchGroup })
        else if (!uniqueTeams.has(hTeam.name)) uniqueTeams.set(hTeam.name, { name: hTeam.name, logo: hTeam.logo, group: "TBD" })
      }
      if (aTeam && aTeam.name) {
        if (!uniqueTeams.has(aTeam.name) && matchGroup !== "TBD") uniqueTeams.set(aTeam.name, { name: aTeam.name, logo: aTeam.logo, group: matchGroup })
        else if (!uniqueTeams.has(aTeam.name)) uniqueTeams.set(aTeam.name, { name: aTeam.name, logo: aTeam.logo, group: "TBD" })
      }
    }

    // Insert Teams into DB
    for (const [name, teamObj] of uniqueTeams.entries()) {
      const existingTeam = await prisma.team.findFirst({ where: { name } })
      if (!existingTeam) {
        await prisma.team.create({
          data: {
            name: teamObj.name,
            flagUrl: teamObj.logo,
            group: teamObj.group
          }
        })
        summary.teamsAdded++
      }
    }

    // Load the teams from DB so we can map them to Game records
    const dbTeams = await prisma.team.findMany()

    // Phase 2: Insert Games
    for (const f of fixtures) {
      const hTeamName = f.teams.home.name
      const aTeamName = f.teams.away.name

      const dbHomeTeam = dbTeams.find(t => t.name === hTeamName)
      const dbAwayTeam = dbTeams.find(t => t.name === aTeamName)

      if (dbHomeTeam && dbAwayTeam) {
        // Map API round to our internal stage enums
        let stage = "Group"
        if (f.league.round) {
          const r = f.league.round.toLowerCase()
          if (r.includes("16")) stage = "R16"
          else if (r.includes("32")) stage = "R32" // World cup 2026 introduces R32
          else if (r.includes("quarter")) stage = "QF"
          else if (r.includes("semi")) stage = "SF"
          else if (r.includes("3rd") || r.includes("third")) stage = "3rd"
          else if (r.includes("final")) stage = "Final"
        }

        const kickoffTime = new Date(f.fixture.date)
        
        // Check if game already exists between these two teams in this stage
        const existingGame = await prisma.game.findFirst({
          where: {
            homeTeamId: dbHomeTeam.id,
            awayTeamId: dbAwayTeam.id,
            stage: stage
          }
        })

        if (!existingGame) {
          await prisma.game.create({
            data: {
              homeTeamId: dbHomeTeam.id,
              awayTeamId: dbAwayTeam.id,
              stage: stage,
              kickoffTime: kickoffTime,
              isFinished: false
            }
          })
          summary.gamesAdded++
        }
      }
    }

  } catch (err) {
    summary.errors.push((err as Error)?.message ?? "Unknown error")
  }

  return NextResponse.json({ success: summary.errors.length === 0, summary })
}
