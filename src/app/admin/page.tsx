import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import {
  Settings, Zap, Clock, Trophy, Users, CalendarClock,
  Goal, ShieldCheck,
} from "lucide-react"

import SyncButton from "./SyncButton"
import SyncPlayersButton from "./SyncPlayersButton"
import InitTournamentButton from "./InitTournamentButton"
import { TimeOverridePanel, MasterResetButton } from "./AdminControls"

import {
  updateGameScoreAction,
  clearGameScoreAction,
  updateGameKickoffAction,
  addKnockoutGameAction,
  deleteGameAction,
  updatePlayerGoalsAction,
  createTeamAction,
  updateTeamGroupAction,
  setChampionAction,
  clearChampionAction,
  setUndefeatedTeamAction,
  setWinlessTeamAction,
  setGroupRankingAction,
  clearGroupRankingAction,
} from "@/app/actions/admin"

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const STAGES = ['Group','R32','R16','QF','SF','Final']
const STAGE_LABELS: Record<string, string> = {
  Group: 'Group Stage', R32: 'Round of 32', R16: 'Round of 16',
  QF: 'Quarter-Finals', SF: 'Semi-Finals', Final: 'Final',
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: subtitle ? '1.5rem' : '1rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: subtitle ? '0.4rem' : 0 }}>
        {icon} {title}
      </h2>
      {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.93rem', margin: 0 }}>{subtitle}</p>}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.isAdmin !== true) redirect("/")

  // ── Load all data ───────────────────────────────────────────────────────────
  const [games, teams, players, tournamentResults] = await Promise.all([
    prisma.game.findMany({ include: { homeTeam: true, awayTeam: true }, orderBy: { kickoffTime: 'asc' } }),
    prisma.team.findMany({ orderBy: [{ group: 'asc' }, { name: 'asc' }] }),
    prisma.player.findMany({ orderBy: { name: 'asc' } }),
    prisma.tournamentResult.findMany(),
  ])

  const resultMap: Record<string, string> = {}
  for (const r of tournamentResults) {
    try { resultMap[r.key] = JSON.parse(r.value) as string }
    catch { resultMap[r.key] = r.value }
  }

  const timeOverride: string | null = resultMap['TimeOverride'] ?? null
  const championId: string | null = resultMap['Champion'] ?? null
  const undefeatedId: string | null = resultMap['Undefeated'] ?? null
  const winlessId: string | null = resultMap['Winless'] ?? null

  const gamesByStage: Record<string, typeof games> = {}
  for (const g of games) {
    if (!gamesByStage[g.stage]) gamesByStage[g.stage] = []
    gamesByStage[g.stage].push(g)
  }

  const teamsByGroup: Record<string, typeof teams> = {}
  for (const t of teams) {
    if (!teamsByGroup[t.group]) teamsByGroup[t.group] = []
    teamsByGroup[t.group].push(t)
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = { padding: '2rem' }
  const subPanelStyle: React.CSSProperties = { background: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '12px' }
  const rowStyle: React.CSSProperties = {
    display: 'grid', alignItems: 'center', gap: '0.5rem',
    padding: '0.5rem 0.6rem', borderRadius: '6px',
    background: 'rgba(0,0,0,0.02)', fontSize: '0.85rem',
  }
  const smallInput: React.CSSProperties = {
    width: '50px', textAlign: 'center' as const,
    background: 'white', border: '1px solid var(--border-subtle)', color: 'black',
    fontWeight: 700, borderRadius: '4px', padding: '0.25rem',
  }
  const selectStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.82rem',
  }

  return (
    <div style={{ maxWidth: '1050px', margin: '2rem auto', padding: '0 1rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2.2rem', marginBottom: '0.4rem' }}>
          <Settings color="var(--accent)" /> Admin — God Mode
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
          Full manual control over every aspect of the tournament. Changes take effect immediately for all users.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        {/* ── 1. Time Override ─────────────────────────────────────────────── */}
        <section className="glass-panel" style={panelStyle}>
          <SectionHeader
            icon={<Clock size={20} color="#f59e0b" />}
            title="Time Override"
            subtitle="Freeze the app clock at any moment to test lock logic, bet visibility, and points — without touching game data."
          />
          <TimeOverridePanel currentOverride={timeOverride} />
        </section>

        {/* ── 2. Match Scores (all stages) ─────────────────────────────────── */}
        <section className="glass-panel" style={panelStyle}>
          <SectionHeader
            icon={<Goal size={20} color="var(--accent)" />}
            title="Match Scores & Status"
            subtitle="Set scores and mark any match as finished or unfinished across all stages."
          />

          {STAGES.map(stage => {
            const stageGames = gamesByStage[stage] ?? []
            return (
              <div key={stage} style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  {STAGE_LABELS[stage]} {stageGames.length > 0 && `(${stageGames.length})`}
                </h3>
                {stageGames.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No {STAGE_LABELS[stage]} games yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: stage === 'Group' ? '300px' : undefined, overflowY: stage === 'Group' ? 'auto' : undefined, paddingRight: stage === 'Group' ? '0.25rem' : undefined }}>
                    {stageGames.map(game => {
                      const kickoffLocal = game.kickoffTime.toISOString().slice(0, 16)
                      return (
                        <form key={game.id} action={updateGameScoreAction}
                          style={{ ...rowStyle, gridTemplateColumns: '1fr auto auto auto 1fr auto auto' }}>
                          <input type="hidden" name="gameId" value={game.id} />
                          <span style={{ textAlign: 'right', fontWeight: 600, fontSize: '0.88rem' }}>{game.homeTeam.name}</span>
                          <input type="number" name="homeScore" defaultValue={game.homeScore ?? ''} min="0" style={smallInput} />
                          <span style={{ color: 'var(--text-secondary)' }}>–</span>
                          <input type="number" name="awayScore" defaultValue={game.awayScore ?? ''} min="0" style={smallInput} />
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{game.awayTeam.name}</span>
                          {/* Hidden: pass current isFinished, toggled by button label */}
                          <select name="isFinished" defaultValue={game.isFinished ? "true" : "false"} style={{ ...selectStyle, width: '95px' }}>
                            <option value="true">Finished</option>
                            <option value="false">Live/Future</option>
                          </select>
                          <button type="submit" className="secondary-btn" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>Save</button>
                        </form>
                      )
                    })}
                  </div>
                )}

                {/* Add knockout game */}
                {stage !== 'Group' && (
                  <details style={{ marginTop: '0.75rem' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
                      + Add {STAGE_LABELS[stage]} game
                    </summary>
                    <form action={addKnockoutGameAction} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'flex-end' }}>
                      <input type="hidden" name="stage" value={stage} />
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Home Team</label>
                        <select name="homeTeamId" required style={selectStyle}>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.group})</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Away Team</label>
                        <select name="awayTeamId" required style={selectStyle}>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.group})</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Kickoff</label>
                        <input type="datetime-local" name="kickoffTime" required className="input-field" style={{ fontSize: '0.85rem', padding: '0.3rem 0.5rem' }} />
                      </div>
                      <button type="submit" className="primary-btn" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>Add Game</button>
                    </form>
                  </details>
                )}
              </div>
            )
          })}
        </section>

        {/* ── 3. Kickoff Times ─────────────────────────────────────────────── */}
        <section className="glass-panel" style={panelStyle}>
          <SectionHeader
            icon={<CalendarClock size={20} color="#6366f1" />}
            title="Kickoff Times"
            subtitle="Adjust when any game is scheduled. Combined with the Time Override, this lets you test any lock scenario."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {games.map(game => {
              const kickoffLocal = game.kickoffTime.toISOString().slice(0, 16)
              return (
                <form key={game.id} action={updateGameKickoffAction}
                  style={{ ...rowStyle, gridTemplateColumns: '0.4fr 1fr auto 1fr auto' }}>
                  <input type="hidden" name="gameId" value={game.id} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{game.stage}</span>
                  <span style={{ textAlign: 'right', fontWeight: 600 }}>{game.homeTeam.name}</span>
                  <input
                    type="datetime-local"
                    name="kickoffTime"
                    defaultValue={kickoffLocal}
                    required
                    className="input-field"
                    style={{ fontSize: '0.82rem', padding: '0.25rem 0.4rem' }}
                  />
                  <span style={{ fontWeight: 600 }}>{game.awayTeam.name}</span>
                  <button type="submit" className="secondary-btn" style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}>Save</button>
                </form>
              )
            })}
          </div>
        </section>

        {/* ── 4. Tournament Results ────────────────────────────────────────── */}
        <section className="glass-panel" style={panelStyle}>
          <SectionHeader
            icon={<Trophy size={20} color="#f59e0b" />}
            title="Tournament Results"
            subtitle="Manually declare official outcomes — champion, undefeated team, winless team, and group rankings. These override automatic derivation from scores."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

            {/* Champion */}
            <div style={subPanelStyle}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🏆 Champion</h3>
              {championId && (
                <p style={{ fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                  Current: <strong>{teams.find(t => t.id === championId)?.name ?? '?'}</strong>
                </p>
              )}
              <form action={setChampionAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select name="teamId" required style={{ ...selectStyle, flex: 1 }}>
                  <option value="">— Select Team —</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.group})</option>)}
                </select>
                <button type="submit" className="primary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Set</button>
              </form>
              {championId && (
                <form action={clearChampionAction} style={{ marginTop: '0.5rem' }}>
                  <button type="submit" className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', color: 'var(--text-secondary)' }}>Clear</button>
                </form>
              )}
            </div>

            {/* Undefeated */}
            <div style={subPanelStyle}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>🛡️ Undefeated Group Team</h3>
              {undefeatedId && (
                <p style={{ fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                  Current: <strong>{teams.find(t => t.id === undefeatedId)?.name ?? '?'}</strong>
                </p>
              )}
              <form action={setUndefeatedTeamAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select name="teamId" required style={{ ...selectStyle, flex: 1 }}>
                  <option value="">— Select Team —</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.group})</option>)}
                </select>
                <button type="submit" className="primary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Set</button>
              </form>
            </div>

            {/* Winless */}
            <div style={subPanelStyle}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>😓 Winless Group Team</h3>
              {winlessId && (
                <p style={{ fontSize: '0.85rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                  Current: <strong>{teams.find(t => t.id === winlessId)?.name ?? '?'}</strong>
                </p>
              )}
              <form action={setWinlessTeamAction} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select name="teamId" required style={{ ...selectStyle, flex: 1 }}>
                  <option value="">— Select Team —</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.group})</option>)}
                </select>
                <button type="submit" className="primary-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Set</button>
              </form>
            </div>

          </div>

          {/* Group Rankings */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>📊 Group Rankings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {GROUPS.map(g => {
                const gTeams = teamsByGroup[g] ?? []
                const existingRanking: string[] = (() => {
                  try { return JSON.parse(JSON.stringify(resultMap[`Group_${g}`] ?? null)) ?? [] } catch { return [] }
                })()
                const currentRanking = Array.isArray(resultMap[`Group_${g}`]) ? resultMap[`Group_${g}`] as unknown as string[] : null

                return (
                  <div key={g} style={subPanelStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Group {g}</h4>
                      {currentRanking && (
                        <form action={clearGroupRankingAction} style={{ display: 'inline' }}>
                          <input type="hidden" name="group" value={g} />
                          <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Clear override</button>
                        </form>
                      )}
                    </div>
                    <form action={setGroupRankingAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <input type="hidden" name="group" value={g} />
                      {[1, 2, 3, 4].map(rank => (
                        <div key={rank} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', width: '1.4rem' }}>{rank}.</span>
                          <select name={`rank${rank}`} required style={{ ...selectStyle, flex: 1 }}
                            defaultValue={Array.isArray(currentRanking) ? (currentRanking[rank - 1] ?? '') : ''}>
                            <option value="">— pick team —</option>
                            {gTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      ))}
                      <button type="submit" className="primary-btn" style={{ marginTop: '0.4rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>Set Group {g}</button>
                    </form>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 5. Player Goals ──────────────────────────────────────────────── */}
        <section className="glass-panel" style={panelStyle}>
          <SectionHeader
            icon={<ShieldCheck size={20} color="#10b981" />}
            title="Player Goals (Golden Boot)"
            subtitle="Set a player's total goals scored. The top scorer automatically receives the +1 bonus on leaderboards."
          />
          <form action={updatePlayerGoalsAction} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Player</label>
              <select name="playerId" className="input-field" required>
                {teams.map(t => (
                  <optgroup key={t.id} label={`${t.name} (Group ${t.group})`}>
                    {players.filter(p => p.teamId === t.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.goalsScored} goal{p.goalsScored !== 1 ? 's' : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Goals</label>
              <input type="number" name="goalsScored" min="0" required className="input-field" />
            </div>
            <button type="submit" className="primary-btn">Update</button>
          </form>
        </section>

        {/* ── 6. Team Manager ──────────────────────────────────────────────── */}
        <section className="glass-panel" style={panelStyle}>
          <SectionHeader
            icon={<Users size={20} color="#8b5cf6" />}
            title="Team Manager"
            subtitle="Move teams between groups or add new teams. Changes affect group pages and all related bets."
          />

          {/* Assign team to a different group */}
          <div style={subPanelStyle}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Move Team to Different Group</h3>
            <form action={updateTeamGroupAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '160px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Team</label>
                <select name="teamId" required className="input-field">
                  <option value="">— Select Team —</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} (currently Group {t.group})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '100px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>New Group</label>
                <select name="group" required className="input-field">
                  {GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
                </select>
              </div>
              <button type="submit" className="primary-btn">Move</button>
            </form>
          </div>

          {/* Current group composition */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Current Group Composition</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {GROUPS.map(g => (
                <div key={g} style={{ ...subPanelStyle, padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--accent)' }}>Group {g}</h4>
                  {(teamsByGroup[g] ?? []).length === 0
                    ? <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>No teams</p>
                    : (teamsByGroup[g] ?? []).map(t => (
                        <div key={t.id} style={{ fontSize: '0.85rem', padding: '0.2rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                          {t.name}
                        </div>
                      ))
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Add team */}
          <details style={{ marginTop: '1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
              + Add a new team
            </summary>
            <form action={createTeamAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Team Name</label>
                <input type="text" name="name" required className="input-field" placeholder="e.g. France" />
              </div>
              <div style={{ flex: 1, minWidth: '80px' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Group</label>
                <select name="group" required className="input-field">
                  {GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Flag URL (optional)</label>
                <input type="url" name="flagUrl" className="input-field" placeholder="https://..." />
              </div>
              <button type="submit" className="primary-btn">Add Team</button>
            </form>
          </details>
        </section>

        {/* ── 7. API Sync ──────────────────────────────────────────────────── */}
        <section className="glass-panel" style={panelStyle}>
          <SectionHeader
            icon={<Zap size={20} color="var(--accent)" />}
            title="API Sync"
            subtitle="Automate score updates and player rosters from API-Football. Use these one-time setup tools and the regular sync cron."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem', color: 'var(--red)' }}>Step 1: One-Time Initialization</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Fetch all 48 teams and the 104-match schedule from the API to seed a blank database.</p>
              <InitTournamentButton />
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>Step 2: Player Rosters (One-Time)</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Deep-scans tournament squads to populate the Golden Boot dropdown. Uses ~50 API calls.</p>
              <SyncPlayersButton />
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>Step 3: Match Scores & Top Scorers (Cron)</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Fetches finished matches and active top scorers. Uses 2 API calls. Also triggered automatically by the cron job.</p>
              <SyncButton />
            </div>
          </div>
        </section>

        {/* ── 8. Master Reset ──────────────────────────────────────────────── */}
        <section className="glass-panel" style={{ ...panelStyle, borderTop: '2px solid rgba(239,68,68,0.25)' }}>
          <SectionHeader
            icon={<Settings size={20} color="#dc2626" />}
            title="Reset & Exit — Undo All Changes"
          />
          <MasterResetButton />
        </section>

      </div>
    </div>
  )
}
