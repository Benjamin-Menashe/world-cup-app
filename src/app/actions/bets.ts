"use server"

import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function saveGroupStageBetsAction(formData: FormData) {
  const userId = await getSession()
  if (!userId) redirect("/login")

  // The formData will contain JSON strings for the complex data
  const groupRankingsRaw = formData.get("groupRankings") as string
  const championId = formData.get("championId") as string
  const topScorerId = formData.get("topScorerId") as string
  const winnerTeamId = formData.get("winnerTeamId") as string
  const loserTeamId = formData.get("loserTeamId") as string

  if (groupRankingsRaw) {
    // groupRankings is Record<string, string[]> i.e., { "A": ["team1", "team2", ...], "B": [...] }
    const groupRankings = JSON.parse(groupRankingsRaw) as Record<string, string[]>
    for (const [group, rankedTeamIds] of Object.entries(groupRankings)) {
      await prisma.groupRankingBet.upsert({
        where: { userId_group: { userId, group } },
        update: { rankedTeamIds: JSON.stringify(rankedTeamIds) },
        create: { userId, group, rankedTeamIds: JSON.stringify(rankedTeamIds) }
      })
    }
  }

  if (championId) {
    await prisma.championBet.upsert({
      where: { userId },
      update: { teamId: championId },
      create: { userId, teamId: championId }
    })
  }

  if (topScorerId) {
    await prisma.topScorerBet.upsert({
      where: { userId },
      update: { playerId: topScorerId },
      create: { userId, playerId: topScorerId }
    })
  }

  if (winnerTeamId && loserTeamId) {
    await prisma.winnerLoserBet.upsert({
      where: { userId },
      update: { winnerTeamId, loserTeamId },
      create: { userId, winnerTeamId, loserTeamId }
    })
  }
}
