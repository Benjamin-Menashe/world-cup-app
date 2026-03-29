import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

const SYNC_SECRET = process.env.SYNC_SECRET || "wc2026-sync-secret"
const SIM_EMAIL_SUFFIX = "@sim.wc2026.test"
const SIM_INVITE_CODE = "SIMGROUP1"

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret")
  if (secret !== SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const log: string[] = []

  // 1. Ensure the simulation group exists, but DO NOT delete it so the admin stays inside it.
  const simGroup = await prisma.group.findUnique({ where: { inviteCode: SIM_INVITE_CODE } })
  if (!simGroup) {
    log.push("No simulation group found, it will be recreated by the main sim.")
  } else {
    log.push("Retained Simulation Group so Admin bindings persist.")
  }

  // 2. Remove sim users and their bets
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
  log.push(simUsers.length ? `Removed ${simUsers.length} sim users and their bets` : "No sim users found")

  // Remove sim player if it was created
  const simPlayer = await prisma.player.findFirst({ where: { name: "[SIM] Golden Boot Star" } })
  if (simPlayer) {
    await prisma.topScorerBet.deleteMany({ where: { playerId: simPlayer.id } })
    await prisma.player.delete({ where: { id: simPlayer.id } })
    log.push("Removed sim player")
  }

  // Wipe generated knockouts and bets mapped against them
  await prisma.gameBet.deleteMany({ where: { game: { stage: { not: 'Group' } } } })
  const deletedKnockouts = await prisma.game.deleteMany({ where: { stage: { not: 'Group' } } })
  log.push(`Removed ${deletedKnockouts.count} knockout games automatically generated`)

  // 3. Reset all group stage game scores
  const updated = await prisma.game.updateMany({
    where: { stage: 'Group' },
    data: { homeScore: null, awayScore: null, isFinished: false }
  })
  log.push(`Reset scores for ${updated.count} group stage games`)

  // 4. Remove simulation TournamentResult entries (group rankings + champion from sim)
  const groupKeys = ['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => `Group_${g}`)
  await prisma.tournamentResult.deleteMany({
    where: { key: { in: [...groupKeys, 'Champion'] } }
  })
  log.push("Cleared group ranking and champion TournamentResult entries")

  // 5. Reset player goals set during simulation
  await prisma.player.updateMany({ where: { goalsScored: { gt: 0 } }, data: { goalsScored: 0 } })
  log.push("Reset all player goal counts to 0")

  return NextResponse.json({ success: true, log })
}
