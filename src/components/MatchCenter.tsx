'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Clock, CheckCircle } from 'lucide-react'

type GameData = {
  id: string
  stage: string
  kickoffTime: string
  homeTeam: { name: string; flagUrl: string }
  awayTeam: { name: string; flagUrl: string }
  homeScore: number | null
  awayScore: number | null
  isFinished: boolean
  isLocked: boolean
  status: 'live' | 'upcoming' | 'finished'
  userPrediction?: { homeScore: number | null, awayScore: number | null } | null
}

type Dict = {
  home: Record<string, string>
}

export default function MatchCenter({
  games,
  dict,
  isLoggedIn,
  appTime,
  lang = 'en'
}: {
  games: GameData[]
  dict: Dict
  isLoggedIn: boolean
  appTime?: string
  lang?: string
}) {
  const router = useRouter()

  const d = dict.home
  const teamsDict = (dict as any).teams || {}

  const isKnockout = (stage: string) => stage !== 'Group'

  const handleSelectGame = async (game: GameData) => {
    if (!isLoggedIn) return

    // Group stage games: no interaction (display only)
    if (!isKnockout(game.stage)) return

    // Knockout game not yet locked: redirect to predictions page
    if (!game.isLocked && !game.isFinished) {
      router.push('/bets/knockout')
      return
    }

    // Knockout game locked/live/finished: redirect to specific game page
    router.push(`/game/${game.id}`)
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const locale = lang === 'he' ? 'he-IL' : 'en-GB'
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jerusalem',
    })
  }

  const formatDateTime = (iso: string) => {
    const date = new Date(iso)
    const locale = lang === 'he' ? 'he-IL' : 'en-GB'
    return date.toLocaleString(locale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jerusalem',
    })
  }

  const statusColor = (status: string) => {
    if (status === 'live') return { bg: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.5)', badge: '#ef4444', badgeBg: 'rgba(239,68,68,0.1)' }
    if (status === 'finished') return { bg: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', badge: '#10b981', badgeBg: 'rgba(16,185,129,0.1)' }
    return { bg: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)', badge: '#3b82f6', badgeBg: 'rgba(59,130,246,0.1)' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Match Center Card */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.3rem' }}>
            <Activity color="var(--red)" size={20} /> {d.matchCenter}
          </h2>
          {appTime && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={14} /> {formatTime(appTime)}
            </div>
          )}
        </div>

        {games.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{d.noGamesAvailable}</p>
        ) : (
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            scrollbarWidth: 'thin'
          }}>
            {games.map(game => {
              const colors = statusColor(game.status)
              const knockout = isKnockout(game.stage)
              const clickable = isLoggedIn && knockout

              return (
                <div
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  style={{
                    minWidth: '200px',
                    maxWidth: '240px',
                    flex: '0 0 auto',
                    background: colors.bg,
                    border: colors.border,
                    borderRadius: '12px',
                    padding: '1rem',
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    position: 'relative'
                  }}
                >
                  {/* Status Badge */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: colors.badge,
                      background: colors.badgeBg,
                      padding: '2px 8px',
                      borderRadius: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      {game.status === 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />}
                      {game.status === 'live' && d.live}
                      {game.status === 'finished' && <><CheckCircle size={10} /> {d.finished}</>}
                      {game.status === 'upcoming' && <><Clock size={10} /> {d.upcoming}</>}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {game.stage}
                    </span>
                  </div>

                  {/* Teams */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {/* Home Team */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={game.homeTeam.flagUrl} alt="" style={{ width: '1.2rem', height: '0.9rem', objectFit: 'cover', borderRadius: '2px' }} />
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{teamsDict[game.homeTeam.name] || game.homeTeam.name}</span>
                      </div>
                      {(game.status === 'live' || game.status === 'finished') && (
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                          {game.homeScore ?? '-'}
                        </span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={game.awayTeam.flagUrl} alt="" style={{ width: '1.2rem', height: '0.9rem', objectFit: 'cover', borderRadius: '2px' }} />
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{teamsDict[game.awayTeam.name] || game.awayTeam.name}</span>
                      </div>
                      {(game.status === 'live' || game.status === 'finished') && (
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                          {game.awayScore ?? '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kickoff time for upcoming */}
                  {game.status === 'upcoming' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.2rem' }}>
                      {knockout && !game.isLocked ? (
                        game.userPrediction ? (
                          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                            {d.yourPrediction || 'Your Pick'}: {game.userPrediction.homeScore} - {game.userPrediction.awayScore}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                            {d.predictNow || '→ Predict now'}
                          </span>
                        )
                      ) : (
                        <>{d.kicksOff} {formatDateTime(game.kickoffTime)}</>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
