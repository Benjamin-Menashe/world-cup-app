import { Trophy, Activity, Users, ChevronRight, Edit3 } from "lucide-react";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateUserPoints, getUserRankingsInGroup } from "@/lib/scoring";
import { isGroupStageLocked, deriveGroupStandings } from "@/lib/lockTime";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const userId = await getSession();

  let user = null;
  let points = 0;
  let memberships = [] as { id: string; groupId: string; group: { name: string } }[];
  const groupRankings: Record<string, Awaited<ReturnType<typeof getUserRankingsInGroup>>> = {};

  if (userId) {
    user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        championBets: { include: { team: true } },
        topScorerBets: { include: { player: true } },
        groupRankingBets: true,
        gameBets: { include: { game: true } }
      }
    });
    const res = await calculateUserPoints(userId);
    points = res.total;
    memberships = await prisma.member.findMany({
      where: { userId },
      include: { group: true }
    });

    // Load rankings for each group
    for (const m of memberships) {
      groupRankings[m.groupId] = await getUserRankingsInGroup(m.groupId);
    }
  }

  // Calculate Stats
  let perfectGroupsCount = 0;
  let exactScoresCount = 0;
  
  if (userId && user) {
    const results = await prisma.tournamentResult.findMany();
    const resultMap = results.reduce((acc, curr) => {
      try { acc[curr.key] = JSON.parse(curr.value) } 
      catch { acc[curr.key] = curr.value }
      return acc
    }, {} as Record<string, unknown>);

    // Perfect Groups
    for (const bet of user.groupRankingBets) {
      let actual = resultMap[`Group_${bet.group}`];
      if (!actual || !Array.isArray(actual)) {
        actual = await deriveGroupStandings(bet.group);
      }
      if (actual && Array.isArray(actual)) {
        try {
          const predicted = JSON.parse(bet.rankedTeamIds) as string[];
          if (predicted.length === 4 && predicted.every((id, idx) => id === actual[idx])) {
            perfectGroupsCount++;
          }
        } catch {}
      }
    }

    // Exact Scores in Knockout
    exactScoresCount = user.gameBets.filter(bet => 
      bet.game.stage !== 'Group' && 
      bet.game.isFinished && 
      Number(bet.homeScore) === Number(bet.game.homeScore) && 
      Number(bet.awayScore) === Number(bet.game.awayScore)
    ).length;
  }

  const isLocked = await isGroupStageLocked();
  const tournamentChampion = await prisma.tournamentResult.findUnique({ where: { key: 'Champion' } });
  const isTournamentFinished = !!tournamentChampion;

  const singleGroup = memberships.length === 1 ? memberships[0] : null;
  const singleGroupRankings = singleGroup ? groupRankings[singleGroup.groupId] ?? [] : [];
  const myRankInSingle = singleGroupRankings.find(r => r.userId === userId)?.rank ?? 0;

  // Check if user won any group
  let wonGroup = null;
  if (isTournamentFinished && userId) {
    for (const m of memberships) {
      const rankings = groupRankings[m.groupId] ?? [];
      if (rankings[0]?.userId === userId) {
        wonGroup = m.group;
        break;
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '2rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '50%', boxShadow: '0 0 30px rgba(239, 68, 68, 0.15)' }}>
          <Trophy size={40} color="var(--red)" />
        </div>
        {!wonGroup && (
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
            {user ? `Welcome back, ${user.name}! ⚽` : "Ready for World Cup 2026? 🏆"}
          </h1>
        )}

        {wonGroup && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.02) 100%)', 
            border: '1px solid rgba(245,158,11,0.2)', 
            borderRadius: '12px', 
            padding: '1rem', 
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#d97706', margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              🏆 CHAMPION of {wonGroup.name}!
            </h2>
          </div>
        )}

        {!user && !wonGroup && (
           <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '550px', marginTop: '-0.5rem' }}>
             Create groups, place your predictions, and compete with friends.
           </p>
        )}

        {!userId && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <Link href="/login" className="primary-btn" style={{ padding: '14px 28px', fontSize: '1rem' }}>
              Get Started
            </Link>
          </div>
        )}
      </section>

      {/* Dashboard Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Your Points Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.3rem' }}>
              <Activity color="var(--accent)" size={20} /> Your Points
            </h2>
            {userId ? (
              <Link href="/dashboard" title="View breakdown" className="hover-scale" style={{ 
                fontSize: '2.5rem', 
                fontWeight: 800, 
                color: 'var(--accent)', 
                textDecoration: 'none'
              }}>
                {points}
              </Link>
            ) : (
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-secondary)' }}>--</span>
            )}
          </div>

          {!userId ? (
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Sign in to track your performance!</p>
          ) : user && (
            <div style={{ marginTop: '1rem' }}>
              <Link href={isLocked ? "/bets/knockout" : "/bets/group-stage"} className="secondary-btn" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.4rem',
                background: '#fee2e2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                padding: '0.6rem',
                fontSize: '0.9rem'
              }}>
                <Edit3 size={14} /> Edit My Bets
              </Link>
              
              {/* Condensed Personal Insights - 1 Line */}
              <div style={{ 
                marginTop: '1rem', 
                paddingTop: '0.75rem', 
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.75rem',
                alignItems: 'center',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  🏆 <strong style={{ color: 'var(--text-primary)' }}>{user.championBets[0]?.team.name ?? 'None'}</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  👟 <strong style={{ color: 'var(--text-primary)' }}>{user.topScorerBets[0]?.player.name ?? 'None'}</strong>
                </span>
                {isLocked && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    🎯 <span style={{ marginRight: '0.2rem' }}>exact picks:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{perfectGroupsCount}</strong> groups · <strong style={{ color: 'var(--text-primary)' }}>{exactScoresCount}</strong> scores
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Groups Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.3rem' }}>
              <Users color="var(--success)" size={20} />
              {singleGroup ? singleGroup.group.name : 'Active Groups'}
            </h2>
            {memberships.length > 1 && (
              <Link href="/group" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                View all <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {userId && singleGroup ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(() => {
                const top3 = singleGroupRankings.slice(0, 3);
                const showMeSeparately = myRankInSingle > 3;
                const me = singleGroupRankings.find(r => r.userId === userId);
                
                return (
                  <>
                    {top3.map((member, index) => {
                      const isMe = member.userId === userId;
                      return (
                        <Link key={member.userId} href={`/group/${singleGroup.groupId}/user/${member.userId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.5rem 0.75rem', borderRadius: '8px',
                            background: isMe ? 'rgba(59,130,246,0.1)' : 'rgba(0,0,0,0.02)',
                            border: isMe ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent',
                            transition: 'background 0.15s'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '0.9rem', width: '24px', textAlign: 'center', fontWeight: 700, color: index === 0 ? 'var(--accent)' : 'inherit' }}>
                                #{member.rank}
                              </span>
                              <span style={{ fontWeight: isMe ? 700 : 500, fontSize: '0.95rem' }}>
                                {member.name}{isMe && ' (You)'}
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isMe ? 'var(--accent)' : 'inherit' }}>
                              {member.points} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>pts</span>
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                    {showMeSeparately && me && (
                      <>
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem', margin: '0.2rem 0' }}>•••</div>
                        <Link href={`/group/${singleGroup.groupId}/user/${userId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.5rem 0.75rem', borderRadius: '8px',
                            background: 'rgba(59,130,246,0.1)',
                            border: '1px solid rgba(59,130,246,0.25)',
                            transition: 'background 0.15s'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '0.9rem', width: '24px', textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>
                                #{myRankInSingle}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                {me.name} (You)
                              </span>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent)' }}>
                              {me.points} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>pts</span>
                            </span>
                          </div>
                        </Link>
                      </>
                    )}
                  </>
                );
              })()}
              <Link href={`/group/${singleGroup.groupId}`} style={{ textAlign: 'center', color: 'var(--accent)', fontSize: '0.85rem', padding: '0.4rem', marginTop: '0.4rem' }}>
                View Full Standings →
              </Link>
            </div>
          ) : !userId ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>You are not logged in.</p>
          ) : memberships.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>You haven&apos;t joined any groups yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {memberships.slice(0, 4).map((m: { id: string; groupId: string; group: { name: string } }) => {
                const rankings = groupRankings[m.groupId] ?? [];
                const me = rankings.find((r: { userId: string; points: number }) => r.userId === userId);
                const myRank = rankings.find((r: { userId: string; rank: number }) => r.userId === userId)?.rank ?? 0;
                return (
                  <Link key={m.id} href={`/group/${m.groupId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{m.group.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                           Rank <strong style={{ color: 'var(--accent)' }}>#{myRank}</strong> / {rankings.length}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{me?.points ?? 0}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginLeft: '2px' }}>pts</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {userId && memberships.length === 0 && (
            <Link href="/group" className="secondary-btn" style={{ display: 'inline-block', marginTop: '1rem', width: '100%', textAlign: 'center', fontSize: '0.85rem', padding: '0.5rem' }}>
              Join or Create a Group
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
