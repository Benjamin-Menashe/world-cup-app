"use server"

import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function saveKnockoutBetsAction(formData: FormData) {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const gameScoresRaw = formData.get("gameScores") as string

  if (gameScoresRaw) {
    const gameScores = JSON.parse(gameScoresRaw) as Record<string, { home: number, away: number }>
    
    for (const [gameId, scores] of Object.entries(gameScores)) {
      if (typeof scores.home === 'number' && typeof scores.away === 'number') {
        await prisma.gameBet.upsert({
          where: { userId_gameId: { userId, gameId } },
          update: { homeScore: scores.home, awayScore: scores.away },
          create: { userId, gameId, homeScore: scores.home, awayScore: scores.away }
        })
      }
    }
  }
}
