import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const SIM_EMAIL_SUFFIX = "@sim.wc2026.test"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Determine the base domain for api calls
    const host = req.headers.get("host") || "localhost:3000"
    const protocol = host.includes("localhost") ? "http" : "https"
    const baseUrl = `${protocol}://${host}`

    // 1. CLEAR ALL SIMULATION USERS AND DATA (Always do this)
    const simUsers = await prisma.user.findMany({ where: { email: { endsWith: SIM_EMAIL_SUFFIX } } })
    for (const u of simUsers) {
      await prisma.gameBet.deleteMany({ where: { userId: u.id } })
      await prisma.groupRankingBet.deleteMany({ where: { userId: u.id } })
      await prisma.championBet.deleteMany({ where: { userId: u.id } })
      await prisma.topScorerBet.deleteMany({ where: { userId: u.id } })
      await prisma.winnerLoserBet.deleteMany({ where: { userId: u.id } })
      await prisma.member.deleteMany({ where: { userId: u.id } })
      await prisma.user.delete({ where: { id: u.id } })
    }

    // 2. Clear simulation group
    const simGroup = await prisma.group.findFirst({ where: { name: { contains: "Simulation" } } })
    if (simGroup) {
      await prisma.member.deleteMany({ where: { groupId: simGroup.id } })
      await prisma.group.delete({ where: { id: simGroup.id } })
    }

    // 3. Clear all tournament results (resets points to 0)
    await prisma.tournamentResult.deleteMany()

    // 3b. Reset all player goals (Golden Boot)
    await prisma.player.updateMany({ data: { goalsScored: 0 } })

    // 3c. Delete all knockout games and bets created during simulation
    await prisma.gameBet.deleteMany({ where: { game: { stage: { not: 'Group' } } } })
    await prisma.game.deleteMany({ where: { stage: { not: 'Group' } } })

    // 4. Manually reset all games to "Live" state as a safeguard
    // This addresses "Group stage locked" and "Points not deleted" even if sync fails
    await prisma.game.updateMany({
      data: {
        isFinished: false,
        homeScore: null,
        awayScore: null
      }
    })

    // 4b. Ensure kickoffTimes are back in the future (June 2026)
    // Earliest game is June 11, 2026. If it's currently in the past, reset it.
    const now = new Date()
    const pastGames = await prisma.game.findMany({ 
      where: { stage: 'Group', kickoffTime: { lt: now } } 
    })
    if (pastGames.length > 0) {
      // Small logic to push them back to June 2026 if they are in the past
      // We'll set a base start of June 11, 2026 and increment by 1 hour for each game found in the past
      // as a rough estimate until sync overwrites with exact times.
      let baseDate = new Date('2026-06-11T18:00:00Z')
      for (const pg of pastGames) {
        await prisma.game.update({
          where: { id: pg.id },
          data: { kickoffTime: baseDate }
        })
        baseDate = new Date(baseDate.getTime() + 60 * 60 * 1000)
      }
    }

    // 5. Sync from API to get real dates
    try {
      const syncRes = await fetch(`${baseUrl}/api/sync`, {
        method: "POST",
        headers: { "x-sync-secret": SYNC_SECRET }
      })
      if (!syncRes.ok) {
        console.error("Simulation Exit: Part 2 (Sync) failed.")
      }
    } catch (e) {
      console.error("Simulation Exit: Sync fetch error", e)
    }

    return NextResponse.json({ success: true, message: "Exited simulation, cleared points, and synced live data (or reset games to live state)." })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
