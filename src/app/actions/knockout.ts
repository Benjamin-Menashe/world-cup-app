"use server"

import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getEffectiveNow, getKnockoutLockOverride } from "@/lib/lockTime"

export async function saveKnockoutBetsAction(formData: FormData) {
  const userId = (await getSession())?.userId ?? null
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
    
    // Build upsert operations for unlocked games, then execute as a single transaction
    const upserts = Object.entries(gameScores)
      .filter(([gameId, scores]) => {
        if (typeof scores.home !== 'number' || typeof scores.away !== 'number') return false
        const game = gamesMap.get(gameId)
        if (!game) return false

        let isLocked = false
        if (override === "Locked") isLocked = true
        else if (override === "Unlocked") isLocked = false
        else isLocked = now >= new Date(game.kickoffTime.getTime() - 60 * 60 * 1000)

        return !isLocked
      })
      .map(([gameId, scores]) =>
        prisma.gameBet.upsert({
          where: { userId_gameId: { userId, gameId } },
          update: { homeScore: scores.home, awayScore: scores.away },
          create: { userId, gameId, homeScore: scores.home, awayScore: scores.away }
        })
      )

    if (upserts.length > 0) {
      await prisma.$transaction(upserts)
    }
  }
}
