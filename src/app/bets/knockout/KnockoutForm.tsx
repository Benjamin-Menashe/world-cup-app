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
  homeTeam: { id: string, name: string, flagUrl: string }
  awayTeam: { id: string, name: string, flagUrl: string }
}

const STAGE_ORDER = ['R32', 'R16', 'QF', 'SF', 'Final']
const STAGE_LABELS: Record<string, string> = {
  R32: 'R32',
  R16: 'R16',
  QF: 'QF',
  SF: 'SF',
  Final: 'Final',
}

function isGameLocked(kickoffTime: Date): boolean {
  return new Date() >= new Date(kickoffTime.getTime() - 60 * 60 * 1000)
}

export default function KnockoutForm({
  games,
  existingBets,
  dict,
}: {
  games: Game[]
  existingBets: Record<string, { home: number; away: number }>
  dict: Record<string, any>
}) {
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

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setIsMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

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
      const s = scores[game.id]
      if (!isGameLocked(game.kickoffTime)) {
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
  const firstOpenStage = presentStages.find(stage => !gamesByStage[stage].every(g => isGameLocked(g.kickoffTime)))
  
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {presentStages.map(stage => {
        const stageGames = gamesByStage[stage]
        const allLocked = stageGames.every(g => isGameLocked(g.kickoffTime))
        const anyUnlocked = stageGames.some(g => !isGameLocked(g.kickoffTime))
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
                const locked = isMounted ? isGameLocked(game.kickoffTime) : false
                const kickoff = new Date(game.kickoffTime)
                return (
                  <div key={game.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
                    padding: '1.25rem 1.5rem', background: 'var(--bg-primary)', borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    opacity: locked ? 0.65 : 1
                  }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        {isMounted ? kickoff.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "---"}
                        {locked && <span style={{ marginLeft: '0.5rem', color: 'var(--red)' }}><Lock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {dict.locked}</span>}
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        <Link href={`/team/${game.homeTeam.id}`} style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                          <img src={game.homeTeam.flagUrl} alt={game.homeTeam.name} style={{ width: '1.2rem', height: '0.9rem', objectFit: 'cover', borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
                          {game.homeTeam.name}
                        </Link>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 400, margin: '0 8px' }}>vs</span>
                        <Link href={`/team/${game.awayTeam.id}`} style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                          <img src={game.awayTeam.flagUrl} alt={game.awayTeam.name} style={{ width: '1.2rem', height: '0.9rem', objectFit: 'cover', borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
                          {game.awayTeam.name}
                        </Link>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        <button type="button" onClick={() => handleIncrement(game.id, 'home', -1)} disabled={locked} style={{ background: 'none', border: 'none', color: '#666', padding: '0.5rem 0.75rem', cursor: locked ? 'default' : 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>-</button>
                        <input type="number" min="0" max="99" placeholder="0" disabled={locked} inputMode="numeric" pattern="[0-9]*"
                          style={{ width: '40px', textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold', border: 'none', background: 'transparent', color: 'black', opacity: locked ? 0.5 : 1, margin: 0 }}
                          value={scores[game.id]?.home ?? ""}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "" || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 99)) updateScore(game.id, 'home', val)
                          }}
                        />
                        <button type="button" onClick={() => handleIncrement(game.id, 'home', 1)} disabled={locked} style={{ background: 'none', border: 'none', color: '#666', padding: '0.5rem 0.75rem', cursor: locked ? 'default' : 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>+</button>
                      </div>

                      <span style={{ color: 'var(--text-secondary)', padding: '0 4px', fontWeight: 'bold' }}>:</span>

                      <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        <button type="button" onClick={() => handleIncrement(game.id, 'away', -1)} disabled={locked} style={{ background: 'none', border: 'none', color: '#666', padding: '0.5rem 0.75rem', cursor: locked ? 'default' : 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>-</button>
                        <input type="number" min="0" max="99" placeholder="0" disabled={locked} inputMode="numeric" pattern="[0-9]*"
                          style={{ width: '40px', textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold', border: 'none', background: 'transparent', color: 'black', opacity: locked ? 0.5 : 1, margin: 0 }}
                          value={scores[game.id]?.away ?? ""}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === "" || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 99)) updateScore(game.id, 'away', val)
                          }}
                        />
                        <button type="button" onClick={() => handleIncrement(game.id, 'away', 1)} disabled={locked} style={{ background: 'none', border: 'none', color: '#666', padding: '0.5rem 0.75rem', cursor: locked ? 'default' : 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}>+</button>
                      </div>
                    </div>
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
