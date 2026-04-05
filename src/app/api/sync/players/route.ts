import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const API_KEY = process.env.API_FOOTBALL_KEY || ""
const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const API_BASE = "https://v3.football.api-sports.io"

async function runPlayerSync() {
  const headers = { "x-apisports-key": API_KEY }
  const summary = {
    teamsMatched: 0,
    playersAdded: 0,
    playersSkipped: 0,
    errors: [] as string[],
  }

  try {
    // Fetch teams from major recent tournaments to build an ID map
    const endpoints = [
      `/teams?league=1&season=2022`, // WC 2022
      `/teams?league=4&season=2024`, // Euro 2024
      `/teams?league=9&season=2024`, // Copa America 2024
    ]

    const apiTeams = new Map<string, number>()

    for (const endpoint of endpoints) {
      const res = await fetch(`${API_BASE}${endpoint}`, { headers })
      if (!res.ok) {
        summary.errors.push(`Failed to fetch ${endpoint} (${res.status})`)
        continue
      }
      const data = await res.json()
      for (const t of data.response || []) {
        if (t.team && t.team.name && t.team.id) {
          apiTeams.set(t.team.name.toLowerCase(), t.team.id)
        }
      }
    }

    // Get all DB teams
    const dbTeams = await prisma.team.findMany()

    for (const dbTeam of dbTeams) {
      const apiId = apiTeams.get(dbTeam.name.toLowerCase())
      
      let finalApiId = apiId
      if (!finalApiId) {
        // Look for partial match if exact match fails
        const partialMatch = Array.from(apiTeams.entries()).find(([name]) => 
          name.includes(dbTeam.name.toLowerCase()) || dbTeam.name.toLowerCase().includes(name)
        )
        if (partialMatch) {
          finalApiId = partialMatch[1]
        }
      }
      
      if (!finalApiId) continue

      summary.teamsMatched++

      // Fetch squad for this team
      const squadRes = await fetch(`${API_BASE}/players/squads?team=${finalApiId}`, { headers })
      if (!squadRes.ok) {
        summary.errors.push(`Failed to fetch squad for ${dbTeam.name}`)
        continue
      }

      const squadData = await squadRes.json()
      const squadArray = squadData.response?.[0]?.players || []
      
      // Get existing players for this team from our DB to avoid duplicates
      const existingPlayers = await prisma.player.findMany({
        where: { teamId: dbTeam.id },
        select: { name: true }
      })
      const existingNames = new Set(existingPlayers.map(p => p.name.toLowerCase()))

      for (const p of squadArray) {
        if (existingNames.has(p.name.toLowerCase())) {
          summary.playersSkipped++
        } else {
          await prisma.player.create({
            data: {
              name: p.name,
              teamId: dbTeam.id,
              goalsScored: 0
            }
          })
          summary.playersAdded++
          existingNames.add(p.name.toLowerCase())
        }
      }
    }
  } catch (err) {
    summary.errors.push((err as Error)?.message ?? "Unknown error")
  }

  return NextResponse.json({ success: true, summary })
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return await runPlayerSync()
}
