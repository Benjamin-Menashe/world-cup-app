"use server"

import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

async function verifyAdmin() {
  const userId = await getSession()
  if (!userId) redirect("/login")
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.isAdmin !== true) {
    redirect("/")
  }
  return user
}

// ─────────────────────────────────────────────────────────────────────────────
// Time Override
// ─────────────────────────────────────────────────────────────────────────────

export async function setTimeOverrideAction(formData: FormData) {
  await verifyAdmin()
  const isoString = formData.get("timeOverride") as string
  if (!isoString) return

  await prisma.tournamentResult.upsert({
    where: { key: 'TimeOverride' },
    update: { value: JSON.stringify(isoString) },
    create: { key: 'TimeOverride', value: JSON.stringify(isoString) },
  })
  revalidatePath("/admin")
}

export async function clearTimeOverrideAction() {
  await verifyAdmin()
  await prisma.tournamentResult.deleteMany({ where: { key: 'TimeOverride' } })
  revalidatePath("/admin")
}

// ─────────────────────────────────────────────────────────────────────────────
// Match Scores & Status
// ─────────────────────────────────────────────────────────────────────────────

export async function updateGameScoreAction(formData: FormData) {
  await verifyAdmin()
  
  const gameId = formData.get("gameId") as string
  const homeScore = parseInt(formData.get("homeScore") as string, 10)
  const awayScore = parseInt(formData.get("awayScore") as string, 10)
  const isFinished = formData.get("isFinished") === "true"

  if (gameId && !isNaN(homeScore) && !isNaN(awayScore)) {
    await prisma.game.update({
      where: { id: gameId },
      data: { homeScore, awayScore, isFinished }
    })
  }
  revalidatePath("/admin")
}

export async function updateGameKickoffAction(formData: FormData) {
  await verifyAdmin()
  const gameId = formData.get("gameId") as string
  const kickoffTime = formData.get("kickoffTime") as string
  if (gameId && kickoffTime) {
    await prisma.game.update({
      where: { id: gameId },
      data: { kickoffTime: new Date(kickoffTime) }
    })
  }
  revalidatePath("/admin")
}

export async function clearGameScoreAction(formData: FormData) {
  await verifyAdmin()
  const gameId = formData.get("gameId") as string
  if (gameId) {
    await prisma.game.update({
      where: { id: gameId },
      data: { homeScore: null, awayScore: null, isFinished: false }
    })
  }
  revalidatePath("/admin")
}

// ─────────────────────────────────────────────────────────────────────────────
// Knockout Game Management
// ─────────────────────────────────────────────────────────────────────────────

export async function addKnockoutGameAction(formData: FormData) {
  await verifyAdmin()
  
  const stage = formData.get("stage") as string
  const homeTeamId = formData.get("homeTeamId") as string
  const awayTeamId = formData.get("awayTeamId") as string
  const kickoffTime = formData.get("kickoffTime") as string

  if (stage && homeTeamId && awayTeamId && kickoffTime) {
    await prisma.game.create({
      data: { stage, homeTeamId, awayTeamId, kickoffTime: new Date(kickoffTime) }
    })
  }
  revalidatePath("/admin")
}

export async function deleteGameAction(formData: FormData) {
  await verifyAdmin()
  const gameId = formData.get("gameId") as string
  if (gameId) {
    await prisma.gameBet.deleteMany({ where: { gameId } })
    await prisma.game.delete({ where: { id: gameId } })
  }
  revalidatePath("/admin")
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Management
// ─────────────────────────────────────────────────────────────────────────────

export async function createTeamAction(formData: FormData) {
  await verifyAdmin()
  const name = formData.get("name") as string
  const group = formData.get("group") as string
  const flagUrl = formData.get("flagUrl") as string || ""

  if (name && group) {
    await prisma.team.create({ data: { name, group, flagUrl } })
  }
  revalidatePath("/admin")
}

export async function updateTeamGroupAction(formData: FormData) {
  await verifyAdmin()
  const teamId = formData.get("teamId") as string
  const group = formData.get("group") as string
  if (teamId && group) {
    await prisma.team.update({ where: { id: teamId }, data: { group } })
  }
  revalidatePath("/admin")
}





export async function deleteTeamAction(formData: FormData) {
  await verifyAdmin()
  const teamId = formData.get("teamId") as string
  if (!teamId) return

  // Cascade: delete bets referencing this team, then games, then team
  await prisma.championBet.deleteMany({ where: { teamId } })
  await prisma.winnerLoserBet.deleteMany({ where: { OR: [{ winnerTeamId: teamId }, { loserTeamId: teamId }] } })
  
  const teamGames = await prisma.game.findMany({ where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] } })
  for (const g of teamGames) {
    await prisma.gameBet.deleteMany({ where: { gameId: g.id } })
    await prisma.game.delete({ where: { id: g.id } })
  }
  
  const teamPlayers = await prisma.player.findMany({ where: { teamId } })
  for (const p of teamPlayers) {
    await prisma.topScorerBet.deleteMany({ where: { playerId: p.id } })
  }
  await prisma.player.deleteMany({ where: { teamId } })
  
  await prisma.team.delete({ where: { id: teamId } })
  revalidatePath("/admin")
}

// ─────────────────────────────────────────────────────────────────────────────
// Player / Golden Boot
// ─────────────────────────────────────────────────────────────────────────────

export async function updatePlayerGoalsAction(formData: FormData) {
  await verifyAdmin()
  const playerId = formData.get("playerId") as string
  const goalsScored = parseInt(formData.get("goalsScored") as string, 10)
  if (playerId && !isNaN(goalsScored)) {
    await prisma.player.update({ where: { id: playerId }, data: { goalsScored } })
  }
  revalidatePath("/admin")
}

export async function createPlayerAction(formData: FormData) {
  await verifyAdmin()
  const name = formData.get("name") as string
  const teamId = formData.get("teamId") as string
  if (name && teamId) {
    await prisma.player.create({ data: { name, teamId, goalsScored: 0 } })
  }
  revalidatePath("/admin")
}



export async function deletePlayerAction(formData: FormData) {
  await verifyAdmin()
  const playerId = formData.get("playerId") as string
  if (playerId) {
    await prisma.topScorerBet.deleteMany({ where: { playerId } })
    await prisma.player.delete({ where: { id: playerId } })
  }
  revalidatePath("/admin")
}

// ─────────────────────────────────────────────────────────────────────────────
// Tournament Results (Champion / Undefeated / Winless / Group Rankings)
// ─────────────────────────────────────────────────────────────────────────────

async function upsertResult(key: string, value: unknown) {
  await prisma.tournamentResult.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  })
}

export async function setKnockoutLockOverrideAction(formData: FormData) {
  await verifyAdmin()
  const status = formData.get("status") as string // "Locked", "Unlocked", or "Auto"
  if (status === "Auto") {
    await prisma.tournamentResult.deleteMany({ where: { key: 'KnockoutLockOverride' } })
  } else if (status) {
    await upsertResult('KnockoutLockOverride', status)
  }
  revalidatePath("/admin")
  revalidatePath("/bets/knockout")
}

export async function setChampionAction(formData: FormData) {
  await verifyAdmin()
  const teamId = formData.get("teamId") as string
  if (teamId) await upsertResult('Champion', teamId)
  revalidatePath("/admin")
}

export async function clearChampionAction() {
  await verifyAdmin()
  await prisma.tournamentResult.deleteMany({ where: { key: 'Champion' } })
  revalidatePath("/admin")
}

export async function setUndefeatedTeamAction(formData: FormData) {
  await verifyAdmin()
  const teamIds = formData.getAll("teamId") as string[]
  if (teamIds.length > 0) await upsertResult('Undefeated', teamIds)
  revalidatePath("/admin")
}

export async function clearUndefeatedTeamAction() {
  await verifyAdmin()
  await prisma.tournamentResult.deleteMany({ where: { key: 'Undefeated' } })
  revalidatePath("/admin")
}

export async function setWinlessTeamAction(formData: FormData) {
  await verifyAdmin()
  const teamIds = formData.getAll("teamId") as string[]
  if (teamIds.length > 0) await upsertResult('Winless', teamIds)
  revalidatePath("/admin")
}

export async function clearWinlessTeamAction() {
  await verifyAdmin()
  await prisma.tournamentResult.deleteMany({ where: { key: 'Winless' } })
  revalidatePath("/admin")
}

export async function setGroupRankingAction(formData: FormData) {
  await verifyAdmin()
  const group = formData.get("group") as string
  const rank1 = formData.get("rank1") as string
  const rank2 = formData.get("rank2") as string
  const rank3 = formData.get("rank3") as string
  const rank4 = formData.get("rank4") as string

  if (group && rank1 && rank2 && rank3 && rank4) {
    await upsertResult(`Group_${group}`, [rank1, rank2, rank3, rank4])
  }
  revalidatePath("/admin")
}

export async function clearGroupRankingAction(formData: FormData) {
  await verifyAdmin()
  const group = formData.get("group") as string
  if (group) {
    await prisma.tournamentResult.deleteMany({ where: { key: `Group_${group}` } })
  }
  revalidatePath("/admin")
}

export async function setTournamentResultAction(key: string, value: unknown) {
  await verifyAdmin()
  await upsertResult(key, value)
  revalidatePath("/admin")
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Reset (Total Wipe)
// ─────────────────────────────────────────────────────────────────────────────

export async function masterResetAction() {
  await verifyAdmin()
  // 1. CLEAR ALL PREDICTIONS
  await prisma.gameBet.deleteMany()
  await prisma.groupRankingBet.deleteMany()
  await prisma.championBet.deleteMany()
  await prisma.topScorerBet.deleteMany()
  await prisma.winnerLoserBet.deleteMany()

  // 2. CLEAR ALL TOURNAMENT DATA
  await prisma.tournamentResult.deleteMany()
  await prisma.game.deleteMany()
  // Clear players before teams due to foreign key deps
  await prisma.player.deleteMany()
  await prisma.team.deleteMany()
  revalidatePath("/admin")
}
