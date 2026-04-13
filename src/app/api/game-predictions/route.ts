import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = await getSession()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const gameId = req.nextUrl.searchParams.get("gameId")
  if (!gameId) return NextResponse.json({ error: "Missing gameId" }, { status: 400 })

  // Fetch the game
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { homeTeam: true, awayTeam: true }
  })
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 })

  // Check if predictions should be visible (locked 1h before kickoff)
  const lockTime = new Date(game.kickoffTime.getTime() - 60 * 60 * 1000)
  const isLocked = new Date() >= lockTime

  // Get all groups the current user belongs to
  const memberships = await prisma.member.findMany({
    where: { userId },
    select: { groupId: true }
  })
  const groupIds = memberships.map(m => m.groupId)

  // Get all members from those groups (deduplicated by userId)
  const allMembers = await prisma.member.findMany({
    where: { groupId: { in: groupIds } },
    include: { user: { select: { id: true, name: true } } }
  })

  // Deduplicate by userId
  const memberMap = new Map<string, { userId: string; name: string }>()
  for (const m of allMembers) {
    if (!memberMap.has(m.user.id)) {
      memberMap.set(m.user.id, { userId: m.user.id, name: m.user.name })
    }
  }

  // Fetch all bets for this game from those users
  const userIds = Array.from(memberMap.keys())
  const bets = await prisma.gameBet.findMany({
    where: { gameId, userId: { in: userIds } }
  })
  const betMap = new Map(bets.map(b => [b.userId, { homeScore: b.homeScore, awayScore: b.awayScore }]))

  // Build predictions list
  const predictions = userIds.map(uid => {
    const member = memberMap.get(uid)!
    const bet = betMap.get(uid)
    const isCurrentUser = uid === userId

    // Only show predictions if locked or if it's the current user's own prediction
    const canView = isLocked || isCurrentUser

    return {
      userId: uid,
      name: member.name,
      isCurrentUser,
      homeScore: canView ? (bet?.homeScore ?? null) : null,
      awayScore: canView ? (bet?.awayScore ?? null) : null,
      hasBet: !!bet,
      visible: canView
    }
  })

  // Sort: current user first, then alphabetically
  predictions.sort((a, b) => {
    if (a.isCurrentUser) return -1
    if (b.isCurrentUser) return 1
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json({
    game: {
      id: game.id,
      stage: game.stage,
      kickoffTime: game.kickoffTime.toISOString(),
      homeTeam: { name: game.homeTeam.name, flagUrl: game.homeTeam.flagUrl },
      awayTeam: { name: game.awayTeam.name, flagUrl: game.awayTeam.flagUrl },
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      isFinished: game.isFinished,
      isLocked
    },
    predictions
  })
}
