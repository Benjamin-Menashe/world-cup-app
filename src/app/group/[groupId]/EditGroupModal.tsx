"use client"

import { useState } from "react"
import { updateGroupAction } from "@/app/actions/group"
import { Settings, X } from "lucide-react"

export default function EditGroupModal({ group, dict }: { group: any, dict: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleUpdate(formData: FormData) {
    setIsSubmitting(true)
    setError("")
    try {
      const res = await updateGroupAction(formData)
      if (res?.error) {
        setError(res.error)
      } else {
        setIsOpen(false)
      }
    } catch (e) {
      setError("An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="secondary-btn" 
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
      >
        <Settings size={14} /> {dict.editGroup || "Edit Group"}
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', position: 'relative', margin: '1rem' }}>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={20} />
            </button>
            
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} color="var(--accent)" /> {dict.editGroup || "Edit Group"}
            </h2>
            
            <form action={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="hidden" name="groupId" value={group.id} />
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{dict.leagueName || "Group Name"}</label>
                <input 
                  name="name" 
                  type="text" 
                  defaultValue={group.name} 
                  required 
                  className="input-field" 
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>{dict.groupDescription || "Group Description"}</label>
                <textarea 
                  name="description" 
                  defaultValue={group.description || ""} 
                  maxLength={400} 
                  rows={4}
                  className="input-field" 
                  style={{ width: '100%', padding: '0.6rem 0.8rem', resize: 'vertical' }} 
                  placeholder={dict.groupDescriptionPlaceholder || "Write something about this group..."}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '0.25rem' }}>
                  Max 400 characters
                </div>
              </div>

              {error && <div style={{ color: 'var(--error)', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>{error}</div>}

              <button 
                type="submit" 
                className="primary-btn" 
                style={{ padding: '0.75rem', marginTop: '0.5rem', opacity: isSubmitting ? 0.7 : 1 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "..." : (dict.save || "Save")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
