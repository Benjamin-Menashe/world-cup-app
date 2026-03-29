"use client"

import { loginAction } from "@/app/actions/auth"
import Link from "next/link"
import { useState } from "react"
import { Trophy } from "lucide-react"

export default function LoginPage() {
  const [error, setError] = useState("")

  async function handleSubmit(formData: FormData) {
    const res = await loginAction(formData)
    if (res?.error) setError(res.error)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }} className="glass-panel animate-in">
      <div style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Trophy size={48} color="var(--accent)" style={{ margin: '0 auto 1rem auto' }} />
          <h2>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Sign in to continue your betting journey</p>
        </div>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
            <input name="email" type="email" required className="input-field" placeholder="your@email.com" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
            <input name="password" type="password" required className="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" className="primary-btn" style={{ marginTop: '1rem' }}>
            Sign In
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Don&apos;t have an account? <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
