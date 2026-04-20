"use client"

import { useState } from "react"
import { saveGroupStageBetsAction } from "@/app/actions/bets"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import SearchableSelect from "@/components/SearchableSelect"

function getTeamAbbreviation(teamName: string) {
  const overrides: Record<string, string> = {
    "United States": "USA",
    "Saudi Arabia": "KSA",
    "South Korea": "KOR",
    "Costa Rica": "CRC",
    "New Zealand": "NZL",
    "Ivory Coast": "CIV",
    "South Africa": "RSA",
    "United Arab Emirates": "UAE"
  }
  return overrides[teamName] || teamName.substring(0, 3).toUpperCase()
}

type Team = { id: string, name: string, group: string, flagUrl: string }
type Player = { id: string, name: string, team: { name: string } }
type ExistingBets = {
  groupRankingBets: { group: string, rankedTeamIds: string }[]
  championBets: { teamId: string }[]
  topScorerBets: { playerId: string }[]
  winnerLoserBets: { winnerTeamId: string, loserTeamId: string }[]
} | null

export default function GroupStageForm({
  teams,
  players,
  existingBets,
  isLocked = false,
  dict,
  teamsDict,
  playersDict,
}: {
  teams: Team[]
  players: Player[]
  existingBets: ExistingBets
  isLocked?: boolean
  dict: any
  teamsDict?: Record<string, string>
  playersDict?: Record<string, string>
}) {
  const groupsAlphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  // Build initial rankings — prefer saved order, fall back to alphabetical
  const initialRankings: Record<string, string[]> = {}
  groupsAlphabet.forEach(g => {
    const groupTeams = teams.filter(t => t.group === g).map(t => t.id)
    const saved = existingBets?.groupRankingBets.find(b => b.group === g)
    let parsed: string[] = []
    
    if (saved) {
      try { parsed = JSON.parse(saved.rankedTeamIds) } catch {}
    }

    if (parsed.length > 0) {
      const merged = parsed.filter(id => groupTeams.includes(id))
      const newTeams = groupTeams.filter(id => !merged.includes(id))
      initialRankings[g] = [...merged, ...newTeams]
    } else {
      initialRankings[g] = groupTeams
    }
  })

  const [rankings, setRankings] = useState(initialRankings)
  const [champion, setChampion] = useState(existingBets?.championBets[0]?.teamId ?? "")
  const [topScorer, setTopScorer] = useState(existingBets?.topScorerBets[0]?.playerId ?? "")
  const [winnerTeam, setWinnerTeam] = useState(existingBets?.winnerLoserBets[0]?.winnerTeamId ?? "")
  const [loserTeam, setLoserTeam] = useState(existingBets?.winnerLoserBets[0]?.loserTeamId ?? "")

  const [saved, setSaved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useUnsavedChanges(isDirty && !isLocked)

  function moveTeam(group: string, index: number, direction: 'up' | 'down') {
    const newRanks = { ...rankings }
    const list = [...newRanks[group]]
    if (direction === 'up' && index > 0) {
      const temp = list[index - 1]; list[index - 1] = list[index]; list[index] = temp
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index + 1]; list[index + 1] = list[index]; list[index] = temp
    }
    newRanks[group] = list
    setRankings(newRanks)
    setIsDirty(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const formData = new FormData()
    formData.append("groupRankings", JSON.stringify(rankings))
    if (champion) formData.append("championId", champion)
    if (topScorer) formData.append("topScorerId", topScorer)
    if (winnerTeam) formData.append("winnerTeamId", winnerTeam)
    if (loserTeam) formData.append("loserTeamId", loserTeam)

    setIsSubmitting(true)
    await saveGroupStageBetsAction(formData)
    setSaved(true)
    setIsSubmitting(false)
    setIsDirty(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <fieldset disabled={isLocked} style={{ border: 'none', padding: 0, margin: 0, opacity: isLocked ? 0.7 : 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {!isLocked && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
            <button type="submit" className="primary-btn" disabled={isSubmitting} style={{ padding: '0.75rem 2rem' }}>
              {isSubmitting ? dict.saving : dict.savePredictions}
            </button>
          </div>
        )}

      <section>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
          {dict.mainPicks}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>{dict.champion}</label>
            <SearchableSelect 
              options={teams.map(t => ({ value: t.id, label: teamsDict?.[t.name] || t.name }))}
              value={teams.find(t => t.id === champion) ? { value: champion, label: teamsDict?.[teams.find(t => t.id === champion)?.name || ""] || teams.find(t => t.id === champion)?.name } : null}
              onChange={(val: any) => { setChampion(val?.value || ""); setIsDirty(true) }}
              isDisabled={isLocked}
              placeholder={dict.selectTeam}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>{dict.goldenBoot}</label>
            <SearchableSelect 
              options={players.map(p => ({ value: p.id, label: `${playersDict?.[p.name] || p.name} - ${teamsDict?.[p.team.name] || getTeamAbbreviation(p.team.name)}` }))}
              value={players.find(p => p.id === topScorer) ? { value: topScorer, label: `${playersDict?.[players.find(p => p.id === topScorer)?.name || ""] || players.find(p => p.id === topScorer)?.name} - ${teamsDict?.[players.find(p => p.id === topScorer)?.team.name || ""] || getTeamAbbreviation(players.find(p => p.id === topScorer)?.team.name || "")}` } : null}
              onChange={(val: any) => { setTopScorer(val?.value || ""); setIsDirty(true) }}
              isDisabled={isLocked}
              placeholder={dict.selectPlayer}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
          {dict.groupRankings}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          {dict.rankingsDesc}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
          {groupsAlphabet.map(group => (
            <div key={group} className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>{dict.groupInfo.replace('{group}', group)}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rankings[group].map((teamId, index) => {
                  const team = teams.find(t => t.id === teamId)
                  if (!team) return null
                  return (
                    <div
                      key={teamId}
                      draggable
                      onDragStart={(e) => {
                        if (isLocked) { e.preventDefault(); return; }
                        e.dataTransfer.setData('text/plain', JSON.stringify({ group, index }))
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const data = e.dataTransfer.getData('text/plain')
                        if (!data) return
                        try {
                          const { group: sourceGroup, index: sourceIndex } = JSON.parse(data)
                          if (sourceGroup !== group) return
                          if (sourceIndex === index) return
                          const newRanks = { ...rankings }
                          const list = [...newRanks[group]]
                          const [draggedItem] = list.splice(sourceIndex, 1)
                          list.splice(index, 0, draggedItem)
                          newRanks[group] = list
                          setRankings(newRanks)
                        } catch {}
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: 'var(--bg-primary)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'grab'
                      }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)', width: '20px' }}>{index + 1}</span>
                      
                      <button type="button" onClick={() => moveTeam(group, index, 'up')} disabled={index === 0 || isLocked}
                          style={{ background: 'none', border: 'none', cursor: (index === 0 || isLocked) ? 'default' : 'pointer', color: (index === 0 || isLocked) ? 'rgba(0,0,0,0.1)' : 'var(--accent)', padding: '0 4px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>▲</button>

                      <img src={team.flagUrl} alt={teamsDict?.[team.name] || team.name} style={{ width: '1.5rem', height: '1.1rem', objectFit: 'cover', borderRadius: '2px', display: 'inline-block', marginLeft: '0.2rem' }} />
                      <span style={{ flex: 1 }}>{teamsDict?.[team.name] || team.name}</span>
                      
                      <button type="button" onClick={() => moveTeam(group, index, 'down')} disabled={index === rankings[group].length - 1 || isLocked}
                          style={{ background: 'none', border: 'none', cursor: (index === rankings[group].length - 1 || isLocked) ? 'default' : 'pointer', color: (index === rankings[group].length - 1 || isLocked) ? 'rgba(0,0,0,0.1)' : 'var(--accent)', padding: '0 4px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>▼</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
          {dict.bonusPicks}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', background: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>{dict.undefeated}</label>
            <SearchableSelect 
              options={teams.map(t => ({ value: t.id, label: teamsDict?.[t.name] || t.name }))}
              value={teams.find(t => t.id === winnerTeam) ? { value: winnerTeam, label: teamsDict?.[teams.find(t => t.id === winnerTeam)?.name || ""] || teams.find(t => t.id === winnerTeam)?.name } : null}
              onChange={(val: any) => { setWinnerTeam(val?.value || ""); setIsDirty(true) }}
              isDisabled={isLocked}
              placeholder={dict.selectTeam}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>{dict.winless}</label>
            <SearchableSelect 
              options={teams.map(t => ({ value: t.id, label: teamsDict?.[t.name] || t.name }))}
              value={teams.find(t => t.id === loserTeam) ? { value: loserTeam, label: teamsDict?.[teams.find(t => t.id === loserTeam)?.name || ""] || teams.find(t => t.id === loserTeam)?.name } : null}
              onChange={(val: any) => { setLoserTeam(val?.value || ""); setIsDirty(true) }}
              isDisabled={isLocked}
              placeholder={dict.selectTeam}
            />
          </div>
        </div>
      </section>

      {saved && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '1rem', borderRadius: '8px', color: 'var(--success)', fontWeight: 600 }}>
          {dict.savedSuccess}
        </div>
      )}

      {!isLocked && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
          <button type="submit" className="primary-btn" disabled={isSubmitting} style={{ padding: '0.75rem 2.5rem', fontSize: '1.1rem' }}>
            {isSubmitting ? dict.saving : dict.savePredictions}
          </button>
        </div>
      )}
      </div>
      </fieldset>
    </form>
  )
}
