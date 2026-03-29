import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutList, Swords } from "lucide-react"

export default async function BetsDashboard() {
  const userId = await getSession()
  if (!userId) redirect("/login")

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>My Bets</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        <Link href="/bets/group-stage" className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s', borderTop: '4px solid var(--accent)' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: 'fit-content', padding: '1rem', borderRadius: '12px' }}>
            <LayoutList size={32} color="var(--accent)" />
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Group Stage</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Rank the groups (A-L) and pick your tournament champion, top scorer, and winner/loser teams.</p>
        </Link>
        
        <Link href="/bets/knockout" className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'transform 0.2s', borderTop: '4px solid var(--success)' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: 'fit-content', padding: '1rem', borderRadius: '12px' }}>
            <Swords size={32} color="var(--success)" />
          </div>
          <h2 style={{ fontSize: '1.5rem' }}>Knockout Stage</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Predict exact scorelines for all knockout matches. Bets close 1 hour before kickoff.</p>
        </Link>

      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
        <h3 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>⚠️ Group Stage Deadline</h3>
        <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>All Group Stage bracket predictions MUST be submitted exactly 1 hour before the kickoff of the first World Cup 2026 match (June 11, 2026). Once the deadline passes, you will be locked out of modifying your group brackets!</p>
      </div>
    </div>
  )
}
