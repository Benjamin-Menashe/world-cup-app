import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import GroupStageForm from "./GroupStageForm"
import { LayoutList } from "lucide-react"
import { getGroupStageLockTime } from "@/lib/lockTime"
import { getDictionary } from "@/lib/i18n"

export default async function GroupStageBetsPage() {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })
  const players = await prisma.player.findMany({
    include: { team: true },
    orderBy: { name: 'asc' }
  })

  // Compute lock state from DB
  const lockTime = await getGroupStageLockTime()
  const isLocked = lockTime ? new Date() >= lockTime : false
  const lockDeadline = lockTime ? lockTime.toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  }) : 'TBD (no games scheduled yet)'

  // Load existing bets to pre-populate the form
  const existingBets = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      groupRankingBets: true,
      championBets: { include: { team: true } },
      topScorerBets: { include: { player: true } },
      winnerLoserBets: true,
    }
  })

  const dict = await getDictionary()
  const d = dict.groupStage

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <LayoutList color="var(--accent)" /> {d.pageTitle}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1rem' }}>
          {d.pageDesc}
        </p>
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1rem', borderRadius: '8px', color: 'var(--warning)' }}>
          {isLocked
            ? <>{d.lockedMsg}</>  
            : <span dangerouslySetInnerHTML={{ __html: d.deadlineMsg.replace('{deadline}', `<strong>${lockDeadline === 'TBD (no games scheduled yet)' ? d.noDeadline : lockDeadline}</strong>`) }} />}
        </div>
      </div>

      <GroupStageForm 
        teams={teams} 
        players={players} 
        existingBets={existingBets} 
        isLocked={isLocked} 
        dict={d} 
        teamsDict={(dict as any).teams || {}}
        playersDict={(dict as any).players || {}}
      />
    </div>
  )
}
