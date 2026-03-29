import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import GroupForms from "./GroupForms"
import Link from "next/link"
import { Users } from "lucide-react"

export default async function GroupPage() {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const memberships = await prisma.member.findMany({
    where: { userId },
    include: { group: true }
  })

  // IMMEDIATE REDIRECT if user belongs to at least one group
  if (memberships.length > 0) {
    redirect(`/group/${memberships[0].groupId}`)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <GroupForms />

      <section>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Users color="var(--accent)" /> My Friend Groups
        </h1>
        
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          You haven&apos;t joined any friend leagues yet. Join or create one above!
        </div>
      </section>

    </div>
  )
}
