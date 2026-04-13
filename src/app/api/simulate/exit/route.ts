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
    // 1. CLEAR ALL PREDICTIONS
    await prisma.gameBet.deleteMany()
    await prisma.groupRankingBet.deleteMany()
    await prisma.championBet.deleteMany()
    await prisma.topScorerBet.deleteMany()
    await prisma.winnerLoserBet.deleteMany()

    // 2. CLEAR ALL TOURNAMENT DATA
    await prisma.tournamentResult.deleteMany()
    await prisma.game.deleteMany()
    await prisma.player.deleteMany()
    await prisma.team.deleteMany()

    // No need to run an API sync, let the user re-init manually.

    return NextResponse.json({ success: true, message: "Master Reset complete. All teams, players, matches, and bets have been erased." })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
