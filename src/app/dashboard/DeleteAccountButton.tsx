"use client"

import { useState } from "react"
import { deleteAccountAction } from "@/app/actions/auth"
import { AlertTriangle, Trash2 } from "lucide-react"

export default function DeleteAccountButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    const confirm1 = window.confirm("Are you sure you want to delete? all your bets will be deleted forever")
    if (!confirm1) return

    setLoading(true)
    setError("")

    try {
      const result = await deleteAccountAction()
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch (err) {
      setError("An unexpected error occurred.")
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <AlertTriangle color="var(--error)" />
        <h3 style={{ margin: 0, color: 'var(--error)' }}>Danger Zone</h3>
      </div>
      
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: '600px' }}>
        Once you delete your account, there is no going back. Please be certain. All your bets, memberships, and points will be permanently erased.
      </p>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <button 
        onClick={handleDelete}
        disabled={loading}
        style={{ 
          background: 'rgba(239, 68, 68, 0.1)', 
          color: 'var(--error)', 
          border: '1px solid rgba(239, 68, 68, 0.4)',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: loading ? 0.7 : 1
        }}
        onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)' }}
        onMouseOut={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)' }}
      >
        <Trash2 size={18} />
        {loading ? "Deleting..." : "Delete My Account"}
      </button>
    </div>
  )
}
