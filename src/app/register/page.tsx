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

  // Build Google OAuth URL with invite code preserved
  const googleUrl = inviteCode
    ? `/api/auth/google?inviteCode=${encodeURIComponent(inviteCode)}`
    : `/api/auth/google`

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

        {/* Google Sign-Up Button */}
        <a
          href={googleUrl}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            width: '100%', padding: '0.75rem 1rem', borderRadius: '8px',
            background: 'white', border: '1px solid #dadce0',
            color: '#3c4043', fontSize: '0.95rem', fontWeight: 500,
            textDecoration: 'none', cursor: 'pointer',
            transition: 'box-shadow 0.2s, border-color 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
          onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; e.currentTarget.style.borderColor = '#b0b3b8' }}
          onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#dadce0' }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign up with Google
        </a>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

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
          <button type="submit" className="primary-btn" style={{ marginTop: '0.5rem' }}>
            Create Account with Email
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
