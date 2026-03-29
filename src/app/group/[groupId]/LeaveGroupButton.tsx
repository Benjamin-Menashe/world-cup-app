"use client"

import { LogOut } from "lucide-react"
import { leaveGroupAction } from "@/app/actions/group"

export default function LeaveGroupButton({ groupId }: { groupId: string }) {
  return (
    <form action={leaveGroupAction}>
      <input type="hidden" name="groupId" value={groupId} />
      <button
        type="submit"
        className="secondary-btn"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.6rem 1.25rem', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}
        onClick={(e) => { if (!confirm('Leave this group?')) e.preventDefault() }}
      >
        <LogOut size={14} /> Leave
      </button>
    </form>
  )
}
