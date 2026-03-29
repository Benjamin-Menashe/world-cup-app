"use client"

import { useState } from "react"
import { Copy, CheckCircle } from "lucide-react"

export default function ShareInviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const inviteUrl = `https://world-cup-app-2026.vercel.app/register?inviteCode=${inviteCode}`
    const message = `⚽ Join my World Cup 2026 betting league!\n\n🔑 Invite Code: ${inviteCode}\n\nClick here to join directly:\n${inviteUrl}\n\nLet's go! 🏆`
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button 
      onClick={handleCopy}
      title={copied ? "Copied invite message!" : "Copy invite message to clipboard"}
      style={{ 
        display: 'flex', alignItems: 'center', gap: '0.4rem', 
        background: 'rgba(0,0,0,0.04)', border: '1px solid var(--border-subtle)', 
        padding: '2px 8px 2px 10px', borderRadius: '6px', 
        color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.08em',
        cursor: 'pointer', fontFamily: 'monospace',
        transition: 'background 0.2s'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
    >
      {inviteCode}
      {copied ? <CheckCircle size={14} color="var(--success)" /> : <Copy size={14} style={{ opacity: 0.7 }} />}
    </button>
  )
}
