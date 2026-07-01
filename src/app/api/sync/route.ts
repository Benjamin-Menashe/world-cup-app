import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { deriveGroupStandingsFromGames } from "@/lib/lockTime"
import { teamNamesMatch } from "@/lib/teams"

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


async function runSync(force: boolean = false) {
  const headers = { "x-apisports-key": API_KEY }
  const summary = {
    gamesChecked: 0,
    gamesUpdated: 0,
    gamesSkipped: 0,
    playersChecked: 0,
    playersUpdated: 0,
    errors: [] as string[],
  }

  try {
    // ── 0. Smart early-exit: skip sync if no matches are live or recently finished ──
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const matchDurationMs = 120 * 60 * 1000 // 2h buffer for match duration + halftime

    const activeGames = await prisma.game.findMany({
      where: {
        OR: [
          // Games currently live (kickoff in the past, not yet finished)
          {
            isFinished: false,
            kickoffTime: { lte: now },
          },
          // Games that finished recently (within the last 2 hours)
          {
            isFinished: true,
            kickoffTime: { gte: twoHoursAgo },
          },
          // Games about to start (within the next 30 minutes)
          {
            isFinished: false,
            kickoffTime: {
              lte: new Date(now.getTime() + 30 * 60 * 1000),
              gte: now,
            },
          },
        ],
      },
      select: { id: true },
    })

    if (!force && activeGames.length === 0) {
      return NextResponse.json({
        success: true,
        summary: { ...summary, errors: ["ℹ️ No active/recent matches — skipped sync"] },
      })
    }

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

      // Load processed games to avoid double-counting player goals
      const processedRes = await prisma.tournamentResult.findUnique({ where: { key: 'ProcessedGames' } })
      const processedGames: string[] = processedRes ? JSON.parse(processedRes.value) : []
      let processedGamesUpdated = false

      // Get all players from DB for name matching
      const dbPlayers = await prisma.player.findMany()

      // Get all games from our DB to match by team names
      const dbGames = await prisma.game.findMany({
        include: { homeTeam: true, awayTeam: true }
      })

      for (const fixture of fixtures) {
        // Match by team names (case-insensitive, with fuzzy fallback)
        // Skip DB games where either team is null (TBD knockout games)
        const apiKickoff = new Date(fixture.fixture.date)
        const g = dbGames.find(
          (match) =>
            match.homeTeam &&
            match.awayTeam &&
            teamNamesMatch(match.homeTeam.name, fixture.teams.home.name) &&
            teamNamesMatch(match.awayTeam.name, fixture.teams.away.name) &&
            Math.abs(match.kickoffTime.getTime() - apiKickoff.getTime()) < 48 * 60 * 60 * 1000 // within 48h to avoid group vs knockout mismatch
        )

        if (g) {
          const apiKickoff = new Date(fixture.fixture.date)
          const finishedStatus = ['FT', 'AET', 'PEN']
          const isFinished = finishedStatus.includes(fixture.fixture.status.short)
          const newHomeScore = isFinished ? fixture.score.fulltime.home : fixture.goals.home
          const newAwayScore = isFinished ? fixture.score.fulltime.away : fixture.goals.away

          // Skip update if nothing changed (biggest single ops saver)
          const needsUpdate =
            g.kickoffTime.getTime() !== apiKickoff.getTime() ||
            g.homeScore !== newHomeScore ||
            g.awayScore !== newAwayScore ||
            g.isFinished !== isFinished

          if (needsUpdate) {
            await prisma.game.update({
              where: { id: g.id },
              data: {
                kickoffTime: apiKickoff,
                homeScore: newHomeScore,
                awayScore: newAwayScore,
                isFinished: isFinished,
              },
            })
            summary.gamesUpdated++
          } else {
            summary.gamesSkipped++
          }

          // Fetch player goal events if the game is finished and hasn't been processed yet
          if (isFinished && !processedGames.includes(g.id)) {
            summary.playersChecked++ // using this to count games checked for events
            try {
              const evRes = await fetch(`${API_BASE}/fixtures/events?fixture=${fixture.fixture.id}`, { headers })
              const evData = await evRes.json()
              const events = evData.response || []
              
              const goals = events.filter((e: any) => e.type === 'Goal' && (e.detail === 'Normal Goal' || e.detail === 'Penalty') && e.comments !== 'Penalty Shootout')
              
              for (const goal of goals) {
                const apiName = goal.player.name.toLowerCase()
                const match = dbPlayers.find(p => p.name.toLowerCase().includes(apiName) || apiName.includes(p.name.toLowerCase()))
                
                if (match) {
                  await prisma.player.update({
                    where: { id: match.id },
                    data: { goalsScored: { increment: 1 } }
                  })
                  summary.playersUpdated++
                }
              }
              
              processedGames.push(g.id)
              processedGamesUpdated = true
            } catch (err) {
              summary.errors.push(`Failed to fetch events for ${g.homeTeam?.name ?? 'TBD'} vs ${g.awayTeam?.name ?? 'TBD'}`)
            }
          }
        }
      }

      if (processedGamesUpdated) {
        await prisma.tournamentResult.upsert({
          where: { key: 'ProcessedGames' },
          update: { value: JSON.stringify(processedGames) },
          create: { key: 'ProcessedGames', value: JSON.stringify(processedGames) }
        })
      }

      // ── 1b. Auto-derive and store group standings for completed groups ──────────
      // Batch: fetch all finished group games once, derive standings in-memory (not 12 queries)
      const finishedGroupGames = dbGames.filter(
        g => g.stage === 'Group' && g.isFinished && g.homeScore !== null && g.awayScore !== null
      )
      const teamGroupMap = new Map(dbGames
        .filter(g => g.homeTeam && g.awayTeam)
        .flatMap(g => [
          [g.homeTeamId, g.homeTeam!.group],
          [g.awayTeamId, g.awayTeam!.group],
        ]))

      const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L']
      let groupsFinalized = 0
      for (const gl of groupLetters) {
        const groupGames = finishedGroupGames.filter(g => teamGroupMap.get(g.homeTeamId) === gl)
        const standings = deriveGroupStandingsFromGames(groupGames)
        if (!standings) continue
        await prisma.tournamentResult.upsert({
          where: { key: `Group_${gl}` },
          update: { value: JSON.stringify(standings) },
          create: { key: `Group_${gl}`, value: JSON.stringify(standings) },
        })
        groupsFinalized++
      }
      if (groupsFinalized > 0) summary.errors.push(`ℹ️ Auto-stored standings for ${groupsFinalized} completed group(s)`)
    }

    // Old player topscorers logic removed as we now use event-based matching above
  } catch (err) {
    summary.errors.push((err as Error)?.message ?? "Unknown error")
  }

  return NextResponse.json({ success: true, summary })
}

export async function POST(req: NextRequest) {
  // Simple secret-based auth for manual trigger
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const force = req.nextUrl.searchParams.get("force") === "true"
  return await runSync(force)
}

export async function GET(req: NextRequest) {
  // Vercel Cron automatically sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")
  const force = req.nextUrl.searchParams.get("force") === "true"

  // Primary: check CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return await runSync(force)
  }

  // Fallback: accept SYNC_SECRET via x-sync-secret header
  const syncHeader = req.headers.get("x-sync-secret")
  if (syncHeader && syncHeader === SYNC_SECRET) {
    return await runSync(force)
  }

  return NextResponse.json({ error: "Unauthorized cron endpoint" }, { status: 401 })
}
