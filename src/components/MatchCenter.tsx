'use client'

import { useState } from 'react'
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
  status: 'live' | 'upcoming' | 'finished'
}

type PredictionData = {
  userId: string
  name: string
  isCurrentUser: boolean
  homeScore: number | null
  awayScore: number | null
  hasBet: boolean
  visible: boolean
}

type GamePredictionResponse = {
  game: {
    id: string
    stage: string
    kickoffTime: string
    homeTeam: { name: string; flagUrl: string }
    awayTeam: { name: string; flagUrl: string }
    homeScore: number | null
    awayScore: number | null
    isFinished: boolean
    isLocked: boolean
  }
  predictions: PredictionData[]
}

type Dict = {
  home: Record<string, string>
}

export default function MatchCenter({
  games,
  dict,
  isLoggedIn,
  appTime
}: {
  games: GameData[]
  dict: Dict
  isLoggedIn: boolean
  appTime?: string
}) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<GamePredictionResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const d = dict.home

  const handleSelectGame = async (gameId: string) => {
    if (!isLoggedIn) return
    if (selectedGameId === gameId) {
      setSelectedGameId(null)
      setPredictions(null)
      return
    }
    setSelectedGameId(gameId)
    setLoading(true)
    try {
      const res = await fetch(`/api/game-predictions?gameId=${gameId}`)
      if (res.ok) {
        const data = await res.json()
        setPredictions(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const statusColor = (status: string) => {
    if (status === 'live') return { bg: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.5)', badge: '#ef4444', badgeBg: 'rgba(239,68,68,0.1)' }
    if (status === 'finished') return { bg: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', badge: '#10b981', badgeBg: 'rgba(16,185,129,0.1)' }
    return { bg: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.25)', badge: '#3b82f6', badgeBg: 'rgba(59,130,246,0.1)' }
  }

  // Compute scoring for a prediction
  const computePoints = (pred: PredictionData, game: GamePredictionResponse['game']) => {
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
              const isSelected = selectedGameId === game.id

              return (
                <div
                  key={game.id}
                  onClick={() => handleSelectGame(game.id)}
                  style={{
                    minWidth: '200px',
                    maxWidth: '240px',
                    flex: '0 0 auto',
                    background: isSelected ? 'rgba(59,130,246,0.12)' : colors.bg,
                    border: isSelected ? '2px solid var(--accent)' : colors.border,
                    borderRadius: '12px',
                    padding: '1rem',
                    cursor: isLoggedIn ? 'pointer' : 'default',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <img src={game.homeTeam.flagUrl} alt="" style={{ width: 18, height: 13, borderRadius: 2, objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{game.homeTeam.name.length > 12 ? game.homeTeam.name.substring(0, 3).toUpperCase() : game.homeTeam.name}</span>
                      </div>
                      {(game.status === 'live' || game.status === 'finished') && (
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>
                          {game.homeScore ?? '?'}
                        </span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <img src={game.awayTeam.flagUrl} alt="" style={{ width: 18, height: 13, borderRadius: 2, objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{game.awayTeam.name.length > 12 ? game.awayTeam.name.substring(0, 3).toUpperCase() : game.awayTeam.name}</span>
                      </div>
                      {(game.status === 'live' || game.status === 'finished') && (
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace' }}>
                          {game.awayScore ?? '?'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kickoff time for upcoming */}
                  {game.status === 'upcoming' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.2rem' }}>
                      {d.kicksOff} {formatTime(game.kickoffTime)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Predictions Panel */}
      {isLoggedIn && selectedGameId && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.2rem', marginBottom: '1rem' }}>
            ⚽ {d.predictions}
          </h2>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <div style={{ width: 24, height: 24, border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : predictions ? (
            <div>
              {/* Game header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                padding: '0.75rem',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '10px',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <img src={predictions.game.homeTeam.flagUrl} alt="" style={{ width: 20, borderRadius: 2 }} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{predictions.game.homeTeam.name}</span>
                </div>
                {predictions.game.isFinished ? (
                  <span style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 800 }}>
                    {predictions.game.homeScore} - {predictions.game.awayScore}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>vs</span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{predictions.game.awayTeam.name}</span>
                  <img src={predictions.game.awayTeam.flagUrl} alt="" style={{ width: 20, borderRadius: 2 }} />
                </div>
              </div>

              {/* Predictions list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {predictions.predictions.map(pred => {
                  const pts = computePoints(pred, predictions.game)
                  return (
                    <div
                      key={pred.userId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        background: pred.isCurrentUser ? 'rgba(59,130,246,0.1)' : 'rgba(0,0,0,0.02)',
                        border: pred.isCurrentUser ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          fontWeight: pred.isCurrentUser ? 700 : 500,
                          fontSize: '0.9rem'
                        }}>
                          {pred.name}
                          {pred.isCurrentUser && <span style={{ color: 'var(--accent)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>★</span>}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {pred.visible ? (
                          pred.hasBet ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'white',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-subtle)',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              fontFamily: 'monospace'
                            }}>
                              {pred.homeScore} - {pred.awayScore}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              {d.noPrediction}
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🔒</span>
                        )}

                        {pts !== null && (
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: pts > 0 ? 'var(--success)' : 'var(--text-secondary)',
                            minWidth: '40px',
                            textAlign: 'right'
                          }}>
                            +{pts} {d.pointsEarned}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
              {d.selectGame}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
