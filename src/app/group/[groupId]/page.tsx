import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getUserRankingsInGroup } from "@/lib/scoring"
import { redirect } from "next/navigation"
import { Trophy, ClipboardList, Edit3, BarChart2, Share2 } from "lucide-react"
import Link from "next/link"
import LeaveGroupButton from "./LeaveGroupButton"
import GroupForms from "../GroupForms"
import ShareInviteButton from "./ShareInviteButton"
import ShareRankingButton from "./ShareRankingButton"
import { getDictionary } from "@/lib/i18n"

export default async function GroupDetailPage({ params }: { params: { groupId: string } }) {
  const userId = await getSession()
  if (!userId) redirect("/login")
  
  const { groupId } = await params
  
  const memberships = await prisma.member.findMany({
    where: { userId },
    include: { group: true }
  })

  const group = memberships.find(m => m.groupId === groupId)?.group
  if (!group) redirect("/group")


  const tournamentChampion = await prisma.tournamentResult.findUnique({ where: { key: 'Champion' } })
  const isTournamentFinished = !!tournamentChampion

  const now = new Date()
  // 1. Try to find the "Active" match: Locked but not yet 105m past kickoff (the current or next game)
  let latestRelevantGame = await prisma.game.findFirst({
    where: { 
      stage: { not: 'Group' },
      kickoffTime: { 
        gte: new Date(now.getTime() - 105 * 60 * 1000), // Not "expired" (over 105m old)
        lte: new Date(now.getTime() + 60 * 60 * 1000)   // Is locked (within 1h)
      } 
    },
    orderBy: { kickoffTime: 'asc' }, // Get the EARLIEST in this window (the one happening NOW or next)
    include: { homeTeam: true, awayTeam: true }
  })

  // 2. Fallback: If no match is currently active/upcoming, show the most recent match that finished
  if (!latestRelevantGame) {
    latestRelevantGame = await prisma.game.findFirst({
      where: { 
        stage: { not: 'Group' },
        kickoffTime: { lte: now } // Must be in the past
      },
      orderBy: { kickoffTime: 'desc' }, // Get the LATEST one
      include: { homeTeam: true, awayTeam: true }
    })
  }

  const rankings = await getUserRankingsInGroup(groupId, userId)
  
  const nextGameBets: Record<string, { home: number | null, away: number | null }> = {}
  if (latestRelevantGame) {
    const bets = await prisma.gameBet.findMany({
      where: { gameId: latestRelevantGame.id, userId: { in: rankings.map(r => r.userId) } }
    })
    for (const b of bets) {
      nextGameBets[b.userId] = { home: b.homeScore, away: b.awayScore }
    }
  }
  
  const isMember = rankings.some(r => r.userId === userId)
  if (!isMember) redirect("/group")

  const myRank = rankings.find(r => r.userId === userId)?.rank ?? 0
  const myPoints = rankings.find(r => r.userId === userId)?.points ?? 0
  const leader = rankings[0]
  const gap = leader ? leader.points - myPoints : 0

  const rankMedal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  const dict = await getDictionary()
  const d = dict.group

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>

      {/* Group Switcher Tabs */}
      {memberships.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
          {memberships.map((m) => {
            const isActive = m.groupId === groupId
            return (
              <Link 
                key={m.groupId} 
                href={`/group/${m.groupId}`}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '100px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: isActive ? 'var(--accent)' : 'rgba(0,0,0,0.03)',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  border: isActive ? 'none' : '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease'
                }}
              >
                {m.group.name}
              </Link>
            )
          })}
        </div>
      )}

      {/* Mini Top Menu for Joining/Creating more groups */}
      <div style={{ marginBottom: '2rem' }}>
        <details style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <summary style={{ padding: '0.8rem 1.25rem', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> {d.joinCreateLeague}
          </summary>
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <GroupForms dict={d} />
          </div>
        </details>
      </div>

      {isTournamentFinished && myRank === 1 && (
        <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', textAlign: 'center', boxShadow: '0 4px 15px rgba(245,158,11,0.1)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆🎉</div>
          <h2 style={{ color: 'var(--warning)', margin: 0, fontSize: '1.5rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {d.championOfLeague}
          </h2>
          <p style={{ color: 'var(--text-primary)', marginTop: '0.5rem', fontSize: '1.05rem' }} 
             dangerouslySetInnerHTML={{ __html: d.championDetails.replace('{name}', rankings[0].userId === userId ? dict.home.you.toLowerCase() : rankings[0].name).replace('{points}', String(myPoints)) }} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Trophy size={36} color="var(--accent)" /> {group.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <Share2 size={14} />
            {d.inviteCodeLabel} <ShareInviteButton inviteCode={group.inviteCode} dict={d} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/bets/group-stage" className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}>
            <Edit3 size={14} /> {d.editBets}
          </Link>
          <Link href="/dashboard" className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}>
            <BarChart2 size={14} /> {d.myBreakdown}
          </Link>
          <LeaveGroupButton groupId={groupId} />
          <ShareRankingButton groupName={group.name} rank={myRank} points={myPoints} totalPlayers={rankings.length} dict={d} />
        </div>
      </div>

      {/* My Standing Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{rankMedal(myRank) ?? `#${myRank}`}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{d.yourRank}</div>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{myPoints}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{d.yourPoints}</div>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{gap === 0 ? '—' : `+${gap}`}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{gap === 0 ? d.leadingLeague : d.behindLeader}</div>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{rankings.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{d.totalPlayers}</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
          <ClipboardList color="var(--success)" /> {d.friendsRanking}
        </h2>

        {latestRelevantGame && (() => {
          // A match is "Last Match" once finished or after ~105 mins (90 play + halftime/stoppage) IF we have scores
          const isPastPlayTime = now.getTime() >= (latestRelevantGame.kickoffTime.getTime() + 105 * 60 * 1000)
          const isLastGame = latestRelevantGame.isFinished || (isPastPlayTime && latestRelevantGame.homeScore !== null)
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚡</span>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isLastGame ? "Last Game" : "Upcoming Game"}
                </div>
                <div style={{ fontWeight: 700 }}>
                  <img src={latestRelevantGame.homeTeam.flagUrl} alt="" style={{ width: 16, borderRadius: 2, marginRight: 4, display: 'inline' }} /> {latestRelevantGame.homeTeam.name}
                  {isLastGame ? (
                    <span style={{ margin: '0 8px', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                      {latestRelevantGame.homeScore ?? '?'} - {latestRelevantGame.awayScore ?? '?'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', margin: '0 6px' }}>vs</span>
                  )}
                  <img src={latestRelevantGame.awayTeam.flagUrl} alt="" style={{ width: 16, borderRadius: 2, marginRight: 4, display: 'inline' }} /> {latestRelevantGame.awayTeam.name}
                </div>
              </div>
            </div>
          )
        })()}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {rankings.map((member, index) => {
            const isMe = member.userId === userId
            const medal = rankMedal(member.rank)
            return (
              <Link key={member.userId} href={`/group/${groupId}/user/${member.userId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '40px 140px minmax(130px,1fr) minmax(130px,1fr) minmax(160px,1.2fr) 60px',
                  alignItems: 'center', gap: '1rem',
                  padding: '0.8rem 1.25rem', borderRadius: '12px',
                  background: isMe ? 'rgba(59,130,246,0.12)' : index === 0 ? 'rgba(245,158,11,0.05)' : 'rgba(0,0,0,0.02)',
                  border: isMe ? '1px solid rgba(59,130,246,0.35)' : index === 0 ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
                  transition: 'background 0.15s', cursor: 'pointer'
                }}>
                  {/* Rank */}
                  <span style={{ textAlign: 'center', fontSize: medal ? '1.4rem' : '1rem', fontWeight: 'bold', color: member.rank === 1 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {medal ?? `#${member.rank}`}
                  </span>

                  {/* Name */}
                  <span style={{ fontSize: '0.95rem', fontWeight: isMe ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.name} {isMe && <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>★</span>}
                  </span>

                  {/* Champ */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }} title="Champion Pick">
                    🏆 <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.championName ?? d.hidden}</span>
                  </span>

                  {/* Golden Boot */}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }} title="Golden Boot Pick">
                    👟 <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.goldenBootName ?? d.hidden}</span>
                  </span>

                  {/* Current/Next Match Bet */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {latestRelevantGame ? (() => {
                      const isPastPlayTime = now.getTime() >= (latestRelevantGame.kickoffTime.getTime() + 105 * 60 * 1000)
                      const isLastGame = latestRelevantGame.isFinished || (isPastPlayTime && latestRelevantGame.homeScore !== null)
                      return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', background: 'rgba(59, 130, 246, 0.05)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.1)', whiteSpace: 'nowrap', fontSize: '0.7rem' }} title={isLastGame ? "Bet for last active match" : "Bet for upcoming active match"}>
                          ⚔️ 
                          <span style={{ fontWeight: 700 }}>{latestRelevantGame.homeTeam.name.substring(0,3).toUpperCase()}</span>
                          <span style={{ background: 'white', color: 'black', padding: '0px 4px', borderRadius: '3px', fontWeight: 800 }}>
                            {nextGameBets[member.userId]?.home ?? '0'} : {nextGameBets[member.userId]?.away ?? '0'}
                          </span>
                          <span style={{ fontWeight: 700 }}>{latestRelevantGame.awayTeam.name.substring(0,3).toUpperCase()}</span>
                        </span>
                      )
                    })() : <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>—</span>}
                  </div>

                  {/* Points */}
                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: '0.1rem', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: index === 0 ? 'var(--warning)' : 'inherit' }}>
                      {member.points}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{dict.home.pts}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
