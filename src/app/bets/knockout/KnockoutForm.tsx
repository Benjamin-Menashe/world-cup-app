"use client"

import { useState, useEffect } from "react"
import { saveKnockoutBetsAction } from "@/app/actions/knockout"
import { Lock, CheckCircle, ChevronDown, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"

type Game = {
  id: string
  stage: string
  kickoffTime: Date
  homeTeam: { id: string, name: string, flagUrl: string } | null
  awayTeam: { id: string, name: string, flagUrl: string } | null
  isTbd: boolean
}

const STAGE_ORDER = ['R32', 'R16', 'QF', 'SF', '3rd', 'Final']
const STAGE_LABELS: Record<string, string> = {
  R32: 'R32',
  R16: 'R16',
  QF: 'QF',
  SF: 'SF',
  '3rd': '3rd',
  Final: 'Final',
}

const TBD_FLAG = 'https://flagcdn.com/w320/un.png'

export default function KnockoutForm({
  games,
  existingBets,
  lockedGames,
  dict,
  teamsDict,
  lang,
}: {
  games: Game[]
  existingBets: Record<string, { home: number; away: number }>
  lockedGames: Record<string, boolean>
  dict: Record<string, any>
  teamsDict?: Record<string, string>
  lang?: string
}) {
  const locale = lang === 'he' ? 'he-IL' : 'en-GB'
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>(() => {
    const init: Record<string, { home: string; away: string }> = {}
    for (const game of games) {
      const saved = existingBets[game.id]
      init[game.id] = {
        home: saved !== undefined ? String(saved.home) : "0",
        away: saved !== undefined ? String(saved.away) : "0",
      }
    }
    return init
  })

  const [savedRounds, setSavedRounds] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useUnsavedChanges(isDirty)

  function updateScore(gameId: string, team: 'home' | 'away', value: string) {
    setScores(prev => ({ ...prev, [gameId]: { ...prev[gameId], [team]: value } }))
    setIsDirty(true)
  }

  function handleIncrement(gameId: string, team: 'home' | 'away', delta: number) {
    const current = scores[gameId]?.[team]
    const val = parseInt(current === "" || !current ? "0" : current, 10)
    const next = Math.max(0, Math.min(99, val + delta))
    updateScore(gameId, team, next.toString())
  }

  async function handleSaveRound(stageGames: Game[]) {
    const parsedScores: Record<string, { home: number; away: number }> = {}
    for (const game of stageGames) {
      // Skip TBD games — can't bet on unknown matchup
      if (game.isTbd) continue
      const s = scores[game.id]
      if (!lockedGames[game.id]) {
        parsedScores[game.id] = { 
          home: parseInt(s.home === "" ? "0" : s.home, 10), 
          away: parseInt(s.away === "" ? "0" : s.away, 10) 
        }
      }
    }
    const formData = new FormData()
    formData.append("gameScores", JSON.stringify(parsedScores))
    setIsSaving(true)
    await saveKnockoutBetsAction(formData)
    setIsSaving(false)
    setSavedRounds(prev => ({ ...prev, [stageGames[0].stage]: true }))
    setIsDirty(false)
  }

  // Group games by stage, only include stages that exist
  const gamesByStage: Record<string, Game[]> = {}
  for (const game of games) {
    if (!gamesByStage[game.stage]) gamesByStage[game.stage] = []
    gamesByStage[game.stage].push(game)
  }

  const presentStages = STAGE_ORDER.filter(s => gamesByStage[s]?.length > 0)

  // Auto-collapse logic
  const firstOpenStage = presentStages.find(stage => !gamesByStage[stage].every(g => lockedGames[g.id]))
  
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const stage of presentStages) {
      init[stage] = (stage === firstOpenStage) || (!firstOpenStage && stage === presentStages[presentStages.length - 1])
    }
    return init
  })

  function toggleStage(stage: string) {
    setExpandedStages(prev => ({ ...prev, [stage]: !prev[stage] }))
  }

  if (presentStages.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', border: '1px dashed var(--card-border)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ marginBottom: '1rem' }}>{dict.notOpen}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto' }}>
          {dict.notOpenDesc}
        </p>
      </div>
    )
  }

  // Helper to get team display name
  const getTeamName = (team: Game['homeTeam']) => {
    if (!team) return 'TBD'
    return teamsDict?.[team.name] || team.name
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {presentStages.map(stage => {
        const stageGames = gamesByStage[stage]
        const allLocked = stageGames.every(g => lockedGames[g.id])
        const anyUnlocked = stageGames.some(g => !lockedGames[g.id] && !g.isTbd)
        const isSaved = savedRounds[stage]
        const isExpanded = expandedStages[stage]

        return (
          <section key={stage} className="glass-panel" style={{ padding: '0' }}>
            <button 
              type="button"
              onClick={() => toggleStage(stage)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                padding: '1.5rem 2rem', background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: isExpanded ? '1px solid var(--card-border)' : 'none',
                textAlign: 'left'
              }}
            >
              <h2 style={{ fontSize: '1.5rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                {dict.stages[STAGE_LABELS[stage]] ?? dict.stages[stage] ?? stage}
              </h2>
              {allLocked ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <Lock size={14} /> {dict.allLocked}
                </span>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>{dict.openForPredictions}</span>
              )}
            </button>

            {isExpanded && (
              <div style={{ padding: '2rem' }}>
                {anyUnlocked && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => handleSaveRound(stageGames)}
                      disabled={isSaving} 
                      style={{ padding: '0.75rem 2rem' }}
                    >
                      {isSaving ? dict.saving : dict.savePicks.replace('{stage}', dict.stages[STAGE_LABELS[stage]] ?? dict.stages[stage] ?? stage)}
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: anyUnlocked ? '1.5rem' : '0' }}>
              {stageGames.map(game => {
                const locked = lockedGames[game.id]
                const isTbd = game.isTbd
                const disabled = locked || isTbd
                const kickoff = new Date(game.kickoffTime)
                return (
                  <div key={game.id} style={{
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    padding: '1.25rem 1.5rem', background: 'var(--bg-primary)', borderRadius: '12px',
                    border: isTbd ? '1px dashed var(--border-subtle)' : '1px solid var(--border-subtle)',
                    opacity: locked ? 0.65 : isTbd ? 0.75 : 1
                  }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {kickoff.toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })}
                      {locked && <span style={{ marginInlineStart: '0.5rem', color: 'var(--red)' }}><Lock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {dict.locked}</span>}
                      {isTbd && !locked && <span style={{ marginInlineStart: '0.5rem', color: 'var(--warning, #f59e0b)', fontSize: '0.75rem', fontWeight: 600 }}>⏳ TBD</span>}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {game.homeTeam ? (
                            <Link href={`/team/${game.homeTeam.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              <img src={game.homeTeam.flagUrl} alt={getTeamName(game.homeTeam)} style={{ width: '1.2rem', height: '0.9rem', objectFit: 'cover', borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: '8px' }} />
                              {getTeamName(game.homeTeam)}
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              <img src={TBD_FLAG} alt="TBD" style={{ width: '1.2rem', height: '0.9rem', objectFit: 'cover', borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: '8px', opacity: 0.5 }} />
                              TBD
                            </span>
                          )}
                        </div>
                        {!isTbd && (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden', flexShrink: 0 }}>
                            <button type="button" onClick={() => handleIncrement(game.id, 'home', -1)} disabled={disabled} style={{ background: 'none', border: 'none', color: '#666', padding: '0.4rem 0.6rem', cursor: disabled ? 'default' : 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>-</button>
                            <input type="number" min="0" max="99" placeholder="0" disabled={disabled} inputMode="numeric" pattern="[0-9]*"
                              style={{ width: '36px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', background: 'transparent', color: 'black', opacity: disabled ? 0.5 : 1, margin: 0, padding: 0 }}
                              value={scores[game.id]?.home ?? ""}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === "" || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 99)) updateScore(game.id, 'home', val)
                              }}
                            />
                            <button type="button" onClick={() => handleIncrement(game.id, 'home', 1)} disabled={disabled} style={{ background: 'none', border: 'none', color: '#666', padding: '0.4rem 0.6rem', cursor: disabled ? 'default' : 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>+</button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {game.awayTeam ? (
                            <Link href={`/team/${game.awayTeam.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              <img src={game.awayTeam.flagUrl} alt={getTeamName(game.awayTeam)} style={{ width: '1.2rem', height: '0.9rem', objectFit: 'cover', borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: '8px' }} />
                              {getTeamName(game.awayTeam)}
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              <img src={TBD_FLAG} alt="TBD" style={{ width: '1.2rem', height: '0.9rem', objectFit: 'cover', borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: '8px', opacity: 0.5 }} />
                              TBD
                            </span>
                          )}
                        </div>
                        {!isTbd && (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden', flexShrink: 0 }}>
                            <button type="button" onClick={() => handleIncrement(game.id, 'away', -1)} disabled={disabled} style={{ background: 'none', border: 'none', color: '#666', padding: '0.4rem 0.6rem', cursor: disabled ? 'default' : 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>-</button>
                            <input type="number" min="0" max="99" placeholder="0" disabled={disabled} inputMode="numeric" pattern="[0-9]*"
                              style={{ width: '36px', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', border: 'none', background: 'transparent', color: 'black', opacity: disabled ? 0.5 : 1, margin: 0, padding: 0 }}
                              value={scores[game.id]?.away ?? ""}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === "" || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 99)) updateScore(game.id, 'away', val)
                              }}
                            />
                            <button type="button" onClick={() => handleIncrement(game.id, 'away', 1)} disabled={disabled} style={{ background: 'none', border: 'none', color: '#666', padding: '0.4rem 0.6rem', cursor: disabled ? 'default' : 'pointer', fontSize: '1.1rem', fontWeight: 'bold' }}>+</button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isTbd && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                        ⏳ {dict.waitingForTeams || 'Waiting for teams'}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            {anyUnlocked && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', padding: '0 2rem 2rem 2rem' }}>
                {isSaved && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 600 }}>
                    <CheckCircle size={16} /> {dict.saved}
                  </span>
                )}
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleSaveRound(stageGames)}
                  disabled={isSaving}
                  style={{ padding: '0.75rem 2rem' }}
                >
                  {isSaving ? dict.saving : dict.savePicks.replace('{stage}', dict.stages[STAGE_LABELS[stage]] ?? dict.stages[stage] ?? stage)}
                </button>
              </div>
            )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
