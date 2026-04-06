import { getSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import GroupForms from "./GroupForms"
import { Users } from "lucide-react"
import { getDictionary } from "@/lib/i18n"

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

  const dict = await getDictionary()

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <GroupForms dict={dict.group} />

      <section>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Users color="var(--accent)" /> {dict.group.myFriendGroups}
        </h1>
        
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {dict.group.noLeagues}
        </div>
      </section>

    </div>
  )
}
