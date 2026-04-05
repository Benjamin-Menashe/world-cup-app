import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Settings, Zap, FlaskConical } from "lucide-react"

import SyncButton from "./SyncButton"
import SyncPlayersButton from "./SyncPlayersButton"
import InitTournamentButton from "./InitTournamentButton"
import SimulationTimeline from "./SimulationTimeline"

export default async function AdminDashboardPage() {
  const userId = await getSession()
  if (!userId) redirect("/login")
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.isAdmin !== true) {
    redirect("/")
  }

  // Fetch data needed for admin controls
  const games = await prisma.game.findMany({ include: { homeTeam: true, awayTeam: true }, orderBy: { kickoffTime: 'asc' } })
  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })
  const players = await prisma.player.findMany({ orderBy: { name: 'asc' } })

  // Auto-derive 3-win / 3-loss teams for display
  const finishedGroupGames = games.filter(g => g.stage === 'Group' && g.isFinished)
  const teamRecord: Record<string, { wins: number; losses: number; name: string }> = {}
  for (const game of finishedGroupGames) {
    if (game.homeScore === null || game.awayScore === null) continue
    if (!teamRecord[game.homeTeamId]) teamRecord[game.homeTeamId] = { wins: 0, losses: 0, name: game.homeTeam.name }
    if (!teamRecord[game.awayTeamId]) teamRecord[game.awayTeamId] = { wins: 0, losses: 0, name: game.awayTeam.name }
    if (game.homeScore > game.awayScore) {
      teamRecord[game.homeTeamId].wins++
      teamRecord[game.awayTeamId].losses++
    } else if (game.awayScore > game.homeScore) {
      teamRecord[game.awayTeamId].wins++
      teamRecord[game.homeTeamId].losses++
    }
  }


  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <Settings color="var(--accent)" /> Admin Control Panel
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Manage tournament matches, player goals, and official results to update everyone&apos;s score.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        {/* API Sync */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} color="var(--accent)" /> API Sync
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Automate score updates and player rosters from API-Football. Choose your sync type below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--red)' }}>Step 1: One-Time Initialization</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Fetch all 48 teams and the 104-match schedule from the API to start a completely blank database.</p>
              <InitTournamentButton />
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Step 2: Player Rosters (One-Time)</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Deep scans tournament squads to populate the Golden Boot dropdown. Uses ~50 API calls!</p>
              <SyncPlayersButton />
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Step 3: Match Scores & Top Scorers (Daily/Cron)</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>Fetches finished matches and active top scorers. Uses 2 API calls.</p>
              <SyncButton />
            </div>
          </div>
        </section>

        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FlaskConical size={20} color="#7c3aed" /> Simulation Suite
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Use the <strong>Timeline Steps</strong> to simulate the tournament flow. Step 0 resets everything and sets up test users/bets. Each subsequent step advances time through the tournament stages.
          </p>
          <SimulationTimeline adminId={user.id} />
        </section>

        {/* Tournament Data Manager */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>Tournament Data Manager</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Manually override match scores, player goal totals, and official tournament results internally here.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            
            {/* Matches Overview Override */}
            <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Override Match Scores</h3>
              <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {games.map(game => (
                  <form key={game.id} action={async (formData) => {
                    "use server";
                    const { updateGameScoreAction } = await import("@/app/actions/admin");
                    await updateGameScoreAction(formData);
                  }} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto 1fr auto', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                    <input type="hidden" name="gameId" value={game.id} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{game.stage}</span>
                    <span style={{ textAlign: 'right', fontWeight: 600 }}>{game.homeTeam.name}</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <input type="number" name="homeScore" defaultValue={game.homeScore ?? ''} min="0" required style={{ width: '40px', textAlign: 'center', background: 'white', border: '1px solid var(--border-subtle)', color: 'black', fontWeight: 700, borderRadius: '4px' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                      <input type="number" name="awayScore" defaultValue={game.awayScore ?? ''} min="0" required style={{ width: '40px', textAlign: 'center', background: 'white', border: '1px solid var(--border-subtle)', color: 'black', fontWeight: 700, borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{game.awayTeam.name}</span>
                    <button type="submit" className="secondary-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Save</button>
                  </form>
                ))}
              </div>
            </div>

            {/* Top Scorer Override */}
            <div style={{ background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Override Player Goals</h3>
              <form action={async (formData) => {
                "use server";
                const { updatePlayerGoalsAction } = await import("@/app/actions/admin");
                await updatePlayerGoalsAction(formData);
              }} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Select Player</label>
                  <select name="playerId" className="input-field" required>
                    {teams.map(t => (
                      <optgroup key={t.id} label={t.name}>
                        {players.filter(p => p.teamId === t.id).map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.goalsScored} goals)</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Goals</label>
                  <input type="number" name="goalsScored" min="0" required className="input-field" />
                </div>
                <button type="submit" className="primary-btn">Update</button>
              </form>
            </div>

          </div>
        </section>

      </div>
    </div>
  )
}
