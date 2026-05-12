"use server"

import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getEffectiveNow, getKnockoutLockOverride } from "@/lib/lockTime"

export async function saveKnockoutBetsAction(formData: FormData) {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const gameScoresRaw = formData.get("gameScores") as string

  if (gameScoresRaw) {
    const gameScores = JSON.parse(gameScoresRaw) as Record<string, { home: number, away: number }>
    const now = await getEffectiveNow()
    const override = await getKnockoutLockOverride()

    // Batch-fetch all games at once instead of one-by-one
    const gameIds = Object.keys(gameScores)
    const games = await prisma.game.findMany({ where: { id: { in: gameIds } } })
    const gamesMap = new Map(games.map(g => [g.id, g]))
    
    for (const [gameId, scores] of Object.entries(gameScores)) {
      if (typeof scores.home === 'number' && typeof scores.away === 'number') {
        const game = gamesMap.get(gameId)
        if (!game) continue

        let isLocked = false
        if (override === "Locked") isLocked = true
        else if (override === "Unlocked") isLocked = false
        else isLocked = now >= new Date(game.kickoffTime.getTime() - 60 * 60 * 1000)

        if (isLocked) continue

        await prisma.gameBet.upsert({
          where: { userId_gameId: { userId, gameId } },
          update: { homeScore: scores.home, awayScore: scores.away },
          create: { userId, gameId, homeScore: scores.home, awayScore: scores.away }
        })
      }
    }
  }
}
