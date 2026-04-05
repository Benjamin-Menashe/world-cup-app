import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { calculateUserPoints } from "@/lib/scoring"
import { redirect } from "next/navigation"
import { User as UserIcon, Activity, ChevronLeft } from "lucide-react"
import Link from "next/link"
import PointsBreakdownCard from "@/components/PointsBreakdownCard"


export default async function TopScorerDetail({ params }: { params: { groupId: string, userId: string } }) {
  const currentUserId = await getSession()
  if (!currentUserId) redirect("/login")

  const { groupId, userId } = await params

  // Verify current user is in this group
  const currentUserMember = await prisma.member.findUnique({
    where: { userId_groupId: { userId: currentUserId, groupId } }
  })
  if (!currentUserMember) redirect("/group")

  // Verify target user is in this group
  const targetUserMember = await prisma.member.findUnique({
    where: { userId_groupId: { userId, groupId } },
    include: { user: true }
  })
  if (!targetUserMember) redirect(`/group/${groupId}`)

  const targetUser = targetUserMember.user

  // Fetch points & breakdown
  const pointsData = await calculateUserPoints(userId, currentUserId)


  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href={`/group/${groupId}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
          <ChevronLeft size={18} /> Return to Friends List
        </Link>
      </div>

      <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            <UserIcon color="var(--accent)" /> {targetUser.name}&apos;s Profile
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Detailed Picks & Performance</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Points</div>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{pointsData.total}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Points Breakdown Table */}
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--success)' }}>
            <Activity /> Points Breakdown
          </h2>
          <PointsBreakdownCard breakdown={pointsData.breakdown} total={pointsData.total} />
        </section>
      </div>
    </div>
  )
}
