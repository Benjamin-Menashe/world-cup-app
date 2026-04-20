import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const API_KEY = process.env.API_FOOTBALL_KEY || ""
const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const API_BASE = "https://v3.football.api-sports.io"
const LEAGUE_ID = 1
const SEASON = 2026

interface ApiFixture {
  league: { round: string }
  teams: {
    home: { name: string }
    away: { name: string }
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const headers = { "x-apisports-key": API_KEY }
  const summary = {
    teamsFixed: 0,
    teamsAlreadySet: 0,
    teamsMissingFromApi: 0,
    errors: [] as string[],
  }

  try {
    const res = await fetch(`${API_BASE}/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, { headers })
    if (!res.ok) {
      return NextResponse.json({ success: false, error: `API returned ${res.status}`, summary })
    }

    const data = await res.json()
    const fixtures: ApiFixture[] = data.response || []

    if (fixtures.length === 0) {
      return NextResponse.json({ success: false, error: "No fixtures found.", summary })
    }

    // Build a map: team name → group letter from group-stage fixtures only
    const teamGroup = new Map<string, string>()
    for (const f of fixtures) {
      if (!f.league.round?.includes("Group")) continue
      const parts = f.league.round.split(" ")
      const groupLetter = parts[1] // e.g. "A" from "Group A - 1"
      if (!groupLetter || groupLetter === "-") continue

      if (f.teams.home?.name) teamGroup.set(f.teams.home.name, groupLetter)
      if (f.teams.away?.name) teamGroup.set(f.teams.away.name, groupLetter)
    }

    // Get all DB teams
    const dbTeams = await prisma.team.findMany()

    for (const team of dbTeams) {
      if (team.group !== "TBD") {
        summary.teamsAlreadySet++
        continue
      }

      // Try exact match first, then case-insensitive
      let group = teamGroup.get(team.name)
      if (!group) {
        const lower = team.name.toLowerCase()
        for (const [apiName, g] of teamGroup.entries()) {
          if (apiName.toLowerCase() === lower) { group = g; break }
        }
      }

      if (group) {
        await prisma.team.update({ where: { id: team.id }, data: { group } })
        summary.teamsFixed++
      } else {
        summary.teamsMissingFromApi++
        summary.errors.push(`Could not find group for: ${team.name}`)
      }
    }
  } catch (err) {
    summary.errors.push((err as Error)?.message ?? "Unknown error")
  }

  return NextResponse.json({ success: summary.errors.length === 0 || summary.teamsFixed > 0, summary })
}
