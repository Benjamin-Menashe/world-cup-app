import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getEffectiveNow } from "@/lib/lockTime"
import prisma from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

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

  const computePoints = (pred: any) => {
    if (!game.isFinished || game.homeScore === null || game.awayScore === null) return null
    if (!pred.visible || pred.homeScore === null || pred.awayScore === null) return null

    const bh = pred.homeScore
    const ba = pred.awayScore
    const ah = game.homeScore
    const aa = game.awayScore

    let pts = 0
    const betDir = bh > ba ? 1 : bh < ba ? -1 : 0
    const actDir = ah > aa ? 1 : ah < aa ? -1 : 0
    if (betDir === actDir) pts += 2
    if (bh === ah) pts += 1
    if (ba === aa) pts += 1
    if (game.stage === 'Final') pts *= 2
    return pts
  }

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

        {/* Predictions list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {predictions.map(pred => {
            const pts = computePoints(pred)
            return (
              <div
                key={pred.userId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '10px',
                  background: pred.isCurrentUser ? 'rgba(59,130,246,0.08)' : 'rgba(0,0,0,0.02)',
                  border: pred.isCurrentUser ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-subtle)',
                  transition: 'transform 0.1s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    fontWeight: pred.isCurrentUser ? 800 : 600,
                    fontSize: '1rem',
                    color: pred.isCurrentUser ? 'var(--accent)' : 'var(--text-primary)'
                  }}>
                    {pred.name}
                    {pred.isCurrentUser && <span style={{ fontSize: '0.8rem', marginLeft: '0.4rem' }}>★</span>}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {pred.visible ? (
                    pred.hasBet ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '60px',
                        background: 'white',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        fontWeight: 800,
                        fontSize: '1rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}>
                        {pred.homeScore} - {pred.awayScore}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No prediction
                      </span>
                    )
                  ) : (
                    <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>🔒 Hidden</span>
                  )}

                  {pts !== null && (
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: pts > 0 ? 'var(--success)' : 'var(--text-secondary)',
                      minWidth: '50px',
                      textAlign: 'right',
                      background: pts > 0 ? 'rgba(16,185,129,0.1)' : 'transparent',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      +{pts} pts
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          
          {predictions.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No predictions found from your groups.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
