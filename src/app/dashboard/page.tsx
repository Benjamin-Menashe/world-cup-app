import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { calculateUserPoints } from "@/lib/scoring"
import { Edit3, BarChart2 } from "lucide-react"
import Link from "next/link"
import PointsBreakdownCard from "@/components/PointsBreakdownCard"
import { getGroupStageLockTime } from "@/lib/lockTime"
import ShareBreakdownButton from "@/components/ShareBreakdownButton"
import DeleteAccountButton from "./DeleteAccountButton"
import { getDictionary } from "@/lib/i18n"

export default async function DashboardPage() {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const user = await prisma.user.findUnique({ where: { id: userId } })
  const dict = await getDictionary()
  const teamsDict = (dict as any).teams || {}
  const playersDict = (dict as any).players || {}
  const { total, breakdown } = await calculateUserPoints(userId, null, teamsDict, playersDict)




  // Lock derived from first group game kickoff - 1 hour
  const lockTime = await getGroupStageLockTime()
  const isLocked = lockTime ? new Date() >= lockTime : false

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart2 color="var(--accent)" /> {dict.dashboard.myPoints}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{dict.dashboard.welcomeBack.replace('{name}', user?.name || '')}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{dict.dashboard.totalPoints}</div>
          <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{total}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        <Link href={isLocked ? "/bets/knockout" : "/bets/group-stage"} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Edit3 size={15} /> {dict.dashboard.editPicks}
        </Link>
        <ShareBreakdownButton breakdown={breakdown} total={total} userName={user?.name || 'Player'} dict={dict.dashboard} />
      </div>

      {/* Points Breakdown */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem' }}>
          <BarChart2 color="var(--success)" /> {dict.dashboard.pointsBreakdown}
        </h2>
        <PointsBreakdownCard breakdown={breakdown} total={total} dict={dict} />
      </div>

      <DeleteAccountButton dict={dict.dashboard} />
    </div>
  )
}
