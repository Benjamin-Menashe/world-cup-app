import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getEffectiveNow } from "@/lib/lockTime"
import prisma from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import GamePredictionsTabs from "@/components/GamePredictionsTabs"

export default async function GamePredictionsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  
  const session = await getSession()
  const userId = session?.userId ?? null
  if (!userId) {
    redirect('/login')
  }

  // Parallelize independent queries
  const [game, now, memberships] = await Promise.all([
    prisma.game.findUnique({
      where: { id: gameId },
      include: { homeTeam: true, awayTeam: true }
    }),
    getEffectiveNow(),
    prisma.member.findMany({
      where: { userId },
      select: { groupId: true }
    })
  ])

  if (!game) return notFound()

  // Check if predictions should be visible (locked 1h before kickoff)
  const lockTime = new Date(game.kickoffTime.getTime() - 60 * 60 * 1000)
  const isLocked = now >= lockTime

  const groupIds = memberships.map(m => m.groupId)

  // Fetch groups and their members
  const userGroups = await prisma.group.findMany({
    where: { id: { in: groupIds } },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } }
    }
  })

  // Get all unique user IDs across all groups to fetch bets once
  const allUserIds = Array.from(new Set(userGroups.flatMap(g => g.members.map(m => m.user.id))))
  
  const bets = await prisma.gameBet.findMany({
    where: { gameId, userId: { in: allUserIds } }
  })
  
  const betMap = new Map(bets.map(b => [b.userId, { homeScore: b.homeScore, awayScore: b.awayScore }]))

  const groupsData = userGroups.map(group => {
    const predictions = group.members.map(m => {
      const uid = m.user.id
      const bet = betMap.get(uid)
      const isCurrentUser = uid === userId
      const canView = isLocked || isCurrentUser

      return {
        userId: uid,
        name: m.user.name,
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

    return {
      id: group.id,
      name: group.name,
      predictions
    }
  })

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" className="secondary-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} /> Back
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 800 }}>
          Match Predictions
        </h1>

        {/* Game header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '1.5rem',
          background: 'rgba(0,0,0,0.02)',
          borderRadius: '12px',
          marginBottom: '2rem',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <img src={game.homeTeam?.flagUrl || 'https://flagcdn.com/w320/un.png'} alt="" style={{ width: 48, borderRadius: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', textAlign: 'center' }}>{game.homeTeam?.name || 'TBD'}</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            {game.isFinished ? (
              <span style={{ fontSize: '2rem', fontWeight: 900, background: 'var(--accent)', color: 'white', padding: '0.2rem 1rem', borderRadius: '8px' }}>
                {game.homeScore} - {game.awayScore}
              </span>
            ) : (
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '1.2rem', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>VS</span>
            )}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{game.stage}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <img src={game.awayTeam?.flagUrl || 'https://flagcdn.com/w320/un.png'} alt="" style={{ width: 48, borderRadius: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', textAlign: 'center' }}>{game.awayTeam?.name || 'TBD'}</span>
          </div>
        </div>

        <GamePredictionsTabs groupsData={groupsData} game={game} />
      </div>
    </main>
  )
}
