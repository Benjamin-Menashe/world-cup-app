"use client"

import { registerAction } from "@/app/actions/auth"
import Link from "next/link"
import { useState } from "react"
import { Trophy } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '4rem' }}>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get("inviteCode") || ""

  async function handleSubmit(formData: FormData) {
    const res = await registerAction(formData)
    if (res?.error) setError(res.error)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }} className="glass-panel animate-in">
      <div style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Trophy size={48} color="var(--accent)" style={{ margin: '0 auto 1rem auto' }} />
          <h2>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Join the WC 2026 Social Betting app</p>
        </div>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {inviteCode && (
            <input type="hidden" name="inviteCode" value={inviteCode} />
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nickname</label>
            <input name="name" type="text" required className="input-field" placeholder="Your nickname" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
            <input name="email" type="email" required className="input-field" placeholder="your@email.com" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
            <input name="password" type="password" required className="input-field" placeholder="••••••••" minLength={6} />
          </div>
          <button type="submit" className="primary-btn" style={{ marginTop: '1rem' }}>
            Create Account
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
