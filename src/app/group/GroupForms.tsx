"use client"

import { useState } from "react"
import { createGroupAction, joinGroupAction } from "@/app/actions/group"
import { Plus, KeyRound } from "lucide-react"

export default function GroupForms({ dict }: { dict: Record<string, string> }) {
  const [joinError, setJoinError] = useState("")
  const [createError, setCreateError] = useState("")

  async function handleJoin(formData: FormData) {
    const res = await joinGroupAction(formData)
    if (res?.error) setJoinError(res.error)
  }

  async function handleCreate(formData: FormData) {
    const res = await createGroupAction(formData)
    if (res?.error) setCreateError(res.error)
  }

  return (
    <section className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        
        <div style={{ flex: '1 1 300px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '1.05rem' }}>
            <KeyRound size={16} color="var(--success)" /> {dict.joinTitle}
          </h2>
          <form action={handleJoin} style={{ display: 'flex', gap: '0.5rem' }}>
            <input name="inviteCode" type="text" placeholder={dict.inviteCode} required className="input-field" style={{ textTransform: 'uppercase', flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.9rem' }} />
            <button type="submit" className="primary-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>{dict.joinBtn}</button>
          </form>
          {joinError && <div style={{ color: 'var(--error)', marginTop: '0.5rem', fontSize: '0.8rem' }}>{joinError}</div>}
        </div>

        <div style={{ flex: '1 1 300px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '1.05rem' }}>
            <Plus size={16} color="var(--accent)" /> {dict.createTitle}
          </h2>
          <form action={handleCreate} style={{ display: 'flex', gap: '0.5rem' }}>
            <input name="name" type="text" placeholder={dict.leagueName} required className="input-field" style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.9rem' }} />
            <button type="submit" className="secondary-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>{dict.createBtn}</button>
          </form>
          {createError && <div style={{ color: 'var(--error)', marginTop: '0.5rem', fontSize: '0.8rem' }}>{createError}</div>}
        </div>

      </div>
    </section>
  )
}
