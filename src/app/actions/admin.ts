"use server"

import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

async function verifyAdmin() {
  const userId = await getSession()
  if (!userId) redirect("/login")
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.isAdmin !== true) {
    redirect("/")
  }
}

export async function setTournamentResultAction(key: string, value: unknown) {
  await verifyAdmin()
  
  await prisma.tournamentResult.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) }
  })
}

export async function addKnockoutGameAction(formData: FormData) {
  await verifyAdmin()
  
  const stage = formData.get("stage") as string
  const homeTeamId = formData.get("homeTeamId") as string
  const awayTeamId = formData.get("awayTeamId") as string
  const kickoffTime = formData.get("kickoffTime") as string

  if (stage && homeTeamId && awayTeamId && kickoffTime) {
    await prisma.game.create({
      data: {
        stage,
        homeTeamId,
        awayTeamId,
        kickoffTime: new Date(kickoffTime)
      }
    })
  }
}

export async function updateGameScoreAction(formData: FormData) {
  await verifyAdmin()
  
  const gameId = formData.get("gameId") as string
  const homeScore = parseInt(formData.get("homeScore") as string, 10)
  const awayScore = parseInt(formData.get("awayScore") as string, 10)

  if (gameId && !isNaN(homeScore) && !isNaN(awayScore)) {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        homeScore,
        awayScore,
        isFinished: true
      }
    })
  }
}

export async function updatePlayerGoalsAction(formData: FormData) {
  await verifyAdmin()

  const playerId = formData.get("playerId") as string
  const goalsScored = parseInt(formData.get("goalsScored") as string, 10)

  if (playerId && !isNaN(goalsScored)) {
    await prisma.player.update({
      where: { id: playerId },
      data: { goalsScored }
    })
  }
}

export async function createTeamAction(formData: FormData) {
  await verifyAdmin()
  const name = formData.get("name") as string
  const group = formData.get("group") as string
  const flagUrl = formData.get("flagUrl") as string || ""

  if (name && group) {
    await prisma.team.create({
      data: { name, group, flagUrl }
    })
  }
}

export async function createPlayerAction(formData: FormData) {
  await verifyAdmin()
  const name = formData.get("name") as string
  const teamId = formData.get("teamId") as string

  if (name && teamId) {
    await prisma.player.create({
      data: { name, teamId, goalsScored: 0 }
    })
  }
}

export async function setGroupRankingAction(formData: FormData) {
  await verifyAdmin()
  const group = formData.get("group") as string
  const rank1 = formData.get("rank1") as string
  const rank2 = formData.get("rank2") as string
  const rank3 = formData.get("rank3") as string
  const rank4 = formData.get("rank4") as string

  if (group && rank1 && rank2 && rank3 && rank4) {
    const value = [rank1, rank2, rank3, rank4]
    await prisma.tournamentResult.upsert({
      where: { key: `Group_${group}` },
      update: { value: JSON.stringify(value) },
      create: { key: `Group_${group}`, value: JSON.stringify(value) }
    })
  }
}
