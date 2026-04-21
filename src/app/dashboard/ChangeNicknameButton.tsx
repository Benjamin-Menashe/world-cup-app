"use client"

import { useState } from "react"
import { User, CheckCircle, X } from "lucide-react"
import { updateNicknameAction } from "@/app/actions/auth"

interface Props {
  currentName: string
  dict: Record<string, string>
}

export default function ChangeNicknameButton({ currentName, dict }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(currentName)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")

  async function handleSave() {
    if (!name.trim() || name.trim() === currentName) {
      setIsOpen(false)
      return
    }
    setStatus("loading")
    setError("")
    try {
      const result = await updateNicknameAction(name.trim())
      if (result?.error) {
        setError(result.error)
        setStatus("error")
      } else {
        setStatus("success")
        setTimeout(() => {
          setIsOpen(false)
          setStatus("idle")
          window.location.reload()
        }, 1200)
      }
    } catch {
      setError(dict.genericError || "Something went wrong")
      setStatus("error")
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="secondary-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 1.1rem' }}
        >
          <User size={15} />
          {dict.changeNickname || "Change Nickname"}
        </button>
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
          padding: '1.25rem', borderRadius: '12px',
          background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)'
        }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {dict.changeNickname || "Change Nickname"}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
            className="input-field"
            placeholder={dict.nicknamePlaceholder || "Enter your display name..."}
            style={{ fontSize: '1rem' }}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            autoFocus
          />
          {error && (
            <div style={{ fontSize: '0.85rem', color: 'var(--error)' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleSave}
              disabled={status === "loading"}
              className="primary-btn"
              style={{ padding: '0.5rem 1.1rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {status === "success" ? <CheckCircle size={15} /> : null}
              {status === "loading" ? (dict.saving || "Saving...") : status === "success" ? (dict.saved || "Saved!") : (dict.saveNickname || "Save")}
            </button>
            <button
              onClick={() => { setIsOpen(false); setName(currentName); setError(""); setStatus("idle") }}
              className="secondary-btn"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <X size={15} /> {dict.cancel || "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
