"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import SearchableSelect from "@/components/SearchableSelect"
import {
  adminUpdateUserNameAction,
  adminUpdateChampionBetAction,
  adminUpdateTopScorerBetAction,
  adminUpdateKnockoutBetsAction,
} from "@/app/actions/admin"

type UserOption = { id: string; name: string; email: string }
type TeamOption = { id: string; name: string; group: string }
type PlayerOption = { id: string; name: string; teamName: string }
type KnockoutGame = { id: string; stage: string; homeTeamName: string; awayTeamName: string }
type ChampionBetMap = Record<string, string>        // userId -> teamId
type TopScorerBetMap = Record<string, string>        // userId -> playerId
type GameBetMap = Record<string, Record<string, { home: number; away: number }>>  // userId -> gameId -> scores

const STAGE_LABELS: Record<string, string> = {
  R32: 'Round of 32', R16: 'Round of 16',
  QF: 'Quarter-Finals', SF: 'Semi-Finals', Final: 'Final',
}

const subPanelStyle: React.CSSProperties = {
  background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '12px',
}

function SaveButton({ isPending, saved }: { isPending: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="primary-btn"
      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
    >
      {isPending ? <Loader2 size={14} className="spin" /> : saved ? <CheckCircle2 size={14} /> : null}
      {saved ? 'Saved!' : 'Save'}
    </button>
  )
}

export default function UserOverridePanel({
  users, teams, players, knockoutGames,
  championBets, topScorerBets, gameBets,
}: {
  users: UserOption[]
  teams: TeamOption[]
  players: PlayerOption[]
  knockoutGames: KnockoutGame[]
  championBets: ChampionBetMap
  topScorerBets: TopScorerBetMap
  gameBets: GameBetMap
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [namePending, startNameTransition] = useTransition()
  const [nameSaved, setNameSaved] = useState(false)
  const [champPending, startChampTransition] = useTransition()
  const [champSaved, setChampSaved] = useState(false)
  const [scorerPending, startScorerTransition] = useTransition()
  const [scorerSaved, setScorerSaved] = useState(false)
  const [knockoutPending, startKnockoutTransition] = useTransition()
  const [knockoutSaved, setKnockoutSaved] = useState(false)

  // Knockout score local state
  const [knockoutScores, setKnockoutScores] = useState<Record<string, { home: string; away: string }>>({})

  const selectedUser = users.find(u => u.id === selectedUserId)

  function onUserChange(option: any) {
    const uid = option?.value ?? null
    setSelectedUserId(uid)
    setNameSaved(false)
    setChampSaved(false)
    setScorerSaved(false)
    setKnockoutSaved(false)

    // Pre-populate knockout scores for selected user
    if (uid && gameBets[uid]) {
      const scores: Record<string, { home: string; away: string }> = {}
      for (const [gameId, bet] of Object.entries(gameBets[uid])) {
        scores[gameId] = { home: String(bet.home), away: String(bet.away) }
      }
      setKnockoutScores(scores)
    } else {
      setKnockoutScores({})
    }
  }

  function handleKnockoutSave() {
    if (!selectedUserId) return
    const parsed: Record<string, { home: number; away: number }> = {}
    for (const [gameId, scores] of Object.entries(knockoutScores)) {
      const h = parseInt(scores.home, 10)
      const a = parseInt(scores.away, 10)
      if (!isNaN(h) && !isNaN(a)) {
        parsed[gameId] = { home: h, away: a }
      }
    }
    if (Object.keys(parsed).length === 0) return

    const fd = new FormData()
    fd.set("userId", selectedUserId)
    fd.set("gameScores", JSON.stringify(parsed))
    startKnockoutTransition(async () => {
      await adminUpdateKnockoutBetsAction(fd)
      setKnockoutSaved(true)
      setTimeout(() => setKnockoutSaved(false), 2000)
    })
  }

  // Group knockout games by stage
  const gamesByStage: Record<string, KnockoutGame[]> = {}
  for (const g of knockoutGames) {
    if (!gamesByStage[g.stage]) gamesByStage[g.stage] = []
    gamesByStage[g.stage].push(g)
  }

  const smallInput: React.CSSProperties = {
    width: '50px', textAlign: 'center' as const,
    background: 'white', border: '1px solid var(--border-subtle)', color: 'black',
    fontWeight: 700, borderRadius: '4px', padding: '0.25rem',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* User Selector */}
      <div style={subPanelStyle}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Select User</h3>
        <SearchableSelect
          options={users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
          onChange={onUserChange}
          placeholder="— Search by name or email —"
        />
      </div>

      {selectedUser && (
        <>
          {/* Nickname */}
          <div style={subPanelStyle}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>✏️ Nickname</h3>
            <form
              action={(fd: FormData) => {
                fd.set("userId", selectedUser.id)
                startNameTransition(async () => {
                  await adminUpdateUserNameAction(fd)
                  setNameSaved(true)
                  setTimeout(() => setNameSaved(false), 2000)
                })
              }}
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Current: <strong>{selectedUser.name}</strong>
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={selectedUser.name}
                  key={selectedUser.id + '-name'}
                  required
                  className="input-field"
                  placeholder="New nickname…"
                />
              </div>
              <SaveButton isPending={namePending} saved={nameSaved} />
            </form>
          </div>

          {/* Champion Bet */}
          <div style={subPanelStyle}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>🏆 Champion Bet</h3>
            <form
              action={(fd: FormData) => {
                fd.set("userId", selectedUser.id)
                startChampTransition(async () => {
                  await adminUpdateChampionBetAction(fd)
                  setChampSaved(true)
                  setTimeout(() => setChampSaved(false), 2000)
                })
              }}
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Current: <strong>{teams.find(t => t.id === championBets[selectedUser.id])?.name ?? 'None'}</strong>
                </label>
                <SearchableSelect
                  name="teamId"
                  key={selectedUser.id + '-champ'}
                  options={teams.map(t => ({ value: t.id, label: `${t.name} (${t.group})` }))}
                  defaultValue={championBets[selectedUser.id] || undefined}
                  placeholder="— Select Champion —"
                  required
                />
              </div>
              <SaveButton isPending={champPending} saved={champSaved} />
            </form>
          </div>

          {/* Golden Boot */}
          <div style={subPanelStyle}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>⚽ Golden Boot</h3>
            <form
              action={(fd: FormData) => {
                fd.set("userId", selectedUser.id)
                startScorerTransition(async () => {
                  await adminUpdateTopScorerBetAction(fd)
                  setScorerSaved(true)
                  setTimeout(() => setScorerSaved(false), 2000)
                })
              }}
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Current: <strong>{players.find(p => p.id === topScorerBets[selectedUser.id])?.name ?? 'None'}</strong>
                </label>
                <SearchableSelect
                  name="playerId"
                  key={selectedUser.id + '-scorer'}
                  options={players.map(p => ({ value: p.id, label: `${p.name} (${p.teamName})` }))}
                  defaultValue={topScorerBets[selectedUser.id] || undefined}
                  placeholder="— Select Player —"
                  required
                />
              </div>
              <SaveButton isPending={scorerPending} saved={scorerSaved} />
            </form>
          </div>

          {/* Knockout Scores */}
          <div style={subPanelStyle}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>⚔️ Knockout Score Predictions</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Edit score predictions for <strong>{selectedUser.name}</strong>. Leave blank to skip a game. Bypasses all lock restrictions.
            </p>

            {Object.entries(gamesByStage).map(([stage, stageGames]) => (
              <div key={stage} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700,
                  letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem',
                }}>
                  {STAGE_LABELS[stage] ?? stage} ({stageGames.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {stageGames.map(game => {
                    const scores = knockoutScores[game.id] ?? { home: '', away: '' }
                    return (
                      <div key={game.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr auto auto auto 1fr',
                        alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem',
                        borderRadius: '6px', background: 'rgba(0,0,0,0.02)', fontSize: '0.85rem',
                      }}>
                        <span style={{ textAlign: 'right', fontWeight: 600 }}>{game.homeTeamName}</span>
                        <input
                          type="number"
                          min="0"
                          value={scores.home}
                          onChange={e => setKnockoutScores(prev => ({
                            ...prev,
                            [game.id]: { ...prev[game.id] ?? { home: '', away: '' }, home: e.target.value }
                          }))}
                          style={smallInput}
                        />
                        <span style={{ color: 'var(--text-secondary)' }}>–</span>
                        <input
                          type="number"
                          min="0"
                          value={scores.away}
                          onChange={e => setKnockoutScores(prev => ({
                            ...prev,
                            [game.id]: { ...prev[game.id] ?? { home: '', away: '' }, away: e.target.value }
                          }))}
                          style={smallInput}
                        />
                        <span style={{ fontWeight: 600 }}>{game.awayTeamName}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleKnockoutSave}
              disabled={knockoutPending}
              className="primary-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}
            >
              {knockoutPending ? <Loader2 size={14} className="spin" /> : knockoutSaved ? <CheckCircle2 size={14} /> : null}
              {knockoutSaved ? 'Saved!' : 'Save All Knockout Scores'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
