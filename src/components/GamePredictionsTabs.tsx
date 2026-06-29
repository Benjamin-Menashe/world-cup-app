'use client'

import { useState } from 'react'

export default function GamePredictionsTabs({ groupsData, game }: any) {
  const [activeGroupId, setActiveGroupId] = useState(groupsData[0]?.id)

  const activeGroup = groupsData.find((g: any) => g.id === activeGroupId) || groupsData[0]

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

  if (groupsData.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
        You are not in any groups.
      </p>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
        {groupsData.map((g: any) => (
          <button
            key={g.id}
            onClick={() => setActiveGroupId(g.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '100px',
              border: activeGroupId === g.id ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
              background: activeGroupId === g.id ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: activeGroupId === g.id ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: activeGroupId === g.id ? 700 : 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {activeGroup.predictions.map((pred: any) => {
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
        
        {activeGroup.predictions.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            No predictions found in this group.
          </p>
        )}
      </div>
    </div>
  )
}
