import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import KnockoutForm from "./KnockoutForm"
import { Swords } from "lucide-react"
import { getDictionary } from "@/lib/i18n"
import { getEffectiveNow, getKnockoutLockOverride } from "@/lib/lockTime"

export default async function KnockoutBetsPage() {
  const userId = await getSession()
  if (!userId) redirect("/login")

  // Fetch all non-group games
  const games = await prisma.game.findMany({
    where: { stage: { not: 'Group' } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoffTime: 'asc' }
  })

  // Load existing game bets for this user so we can pre-populate
  const existingGameBets = await prisma.gameBet.findMany({
    where: { userId }
  })

  const existingBetsMap: Record<string, { home: number, away: number }> = {}
  for (const bet of existingGameBets) {
    existingBetsMap[bet.gameId] = { home: bet.homeScore, away: bet.awayScore }
  }

  const dict = await getDictionary()
  const d = dict.knockout

  const now = await getEffectiveNow()
  const override = await getKnockoutLockOverride()
  
  const lockedGamesMap: Record<string, boolean> = {}
  for (const g of games) {
    if (override === "Locked") lockedGamesMap[g.id] = true
    else if (override === "Unlocked") lockedGamesMap[g.id] = false
    else lockedGamesMap[g.id] = now >= new Date(g.kickoffTime.getTime() - 60 * 60 * 1000)
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <Swords color="var(--success)" /> {d.pageTitle}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          {d.pageDesc}
        </p>
      </div>

      <KnockoutForm games={games} existingBets={existingBetsMap} lockedGames={lockedGamesMap} dict={d} />
    </div>
  )
}
