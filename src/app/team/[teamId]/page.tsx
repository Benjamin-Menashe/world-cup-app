import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, History } from "lucide-react"

export default async function TeamPage({ params }: { params: { teamId: string } }) {
  const { teamId } = await params

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      players: {
        orderBy: { goalsScored: 'desc' },
      },
      homeGames: {
        include: { awayTeam: true },
        orderBy: { kickoffTime: 'asc' }
      },
      awayGames: {
        include: { homeTeam: true },
        orderBy: { kickoffTime: 'asc' }
      }
    }
  })

  if (!team) redirect("/")

  // Combine and sort games (newest first)
  const allGames = [...team.homeGames, ...team.awayGames].sort(
    (a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime()
  )

  const STAGE_LABELS: Record<string, string> = {
    Group: 'Group Stage',
    R32: 'Round of 32',
    R16: 'Round of 16',
    QF: 'Quarter Finals',
    SF: 'Semi Finals',
    '3rd': 'Third Place Playoff',
    Final: 'Final',
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/bets/knockout" className="secondary-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} /> Back to Bets
        </Link>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '3rem', margin: 0 }}>
          <img src={team.flagUrl} alt={`${team.name} flag`} style={{ width: '64px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }} />
          {team.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginTop: '0.5rem' }}>
          Group {team.group}
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
          <History color="var(--accent)" /> Tournament Schedule & Results
        </h2>

        {allGames.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No games scheduled for this team yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {allGames.map(game => {
              const isHome = game.homeTeamId === team.id
              const gAny = game as unknown as { homeTeam: { name: string; flagUrl: string }, awayTeam: { name: string; flagUrl: string } }
              const opponent = isHome ? gAny.awayTeam : gAny.homeTeam
              const teamScore = isHome ? game.homeScore : game.awayScore
              const oppScore = isHome ? game.awayScore : game.homeScore
              
              let resultColor = 'var(--text-secondary)'
              let resultText = 'Upcoming'
              
              if (game.isFinished && teamScore !== null && oppScore !== null) {
                if (teamScore > oppScore) { resultColor = 'var(--success)'; resultText = 'Win' }
                else if (teamScore < oppScore) { resultColor = 'var(--error)'; resultText = 'Loss' }
                else { resultColor = 'var(--warning)'; resultText = 'Draw' }
              }

              return (
                <div key={game.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
                  padding: '1.25rem', background: 'var(--bg-primary)', borderRadius: '12px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                      {STAGE_LABELS[game.stage] ?? game.stage}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 400 }}>vs</span>
                      <img src={opponent.flagUrl} alt="flag" style={{ width: '20px', borderRadius: '2px' }} />
                      {opponent.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      {new Date(game.kickoffTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                    {game.isFinished ? (
                      <>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'monospace' }}>
                          {teamScore} - {oppScore}
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: resultColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {resultText}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                        vs
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
