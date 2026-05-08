"use client"

import { useState } from "react"
import { Copy, CheckCircle } from "lucide-react"

export default function ShareInviteButton({ inviteCode, dict }: { inviteCode: string; dict?: any }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const inviteUrl = `https://world-cup-app-2026.vercel.app/register?inviteCode=${inviteCode}`
    const defaultMessage = `The World Cup is almost here! 🌍⚽ I'm hosting a betting group and you're invited.\n\nPhase 1: Rank the groups, pick the overall Champion and Golden Boot winner.\nPhase 2: Predict the outcomes for every knockout game!\n\nIt's going to be intense. Click here to join my group before the games start:\n${inviteUrl}\n\n(Invite Code: ${inviteCode})`
    const message = dict ? dict.inviteMessage.replace('{inviteCode}', inviteCode).replace('{inviteUrl}', inviteUrl) : defaultMessage
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <button 
      onClick={handleCopy}
      title={copied ? (dict?.copiedInviteMsg || "Copied invite message!") : (dict?.copyInviteMsg || "Copy invite message to clipboard")}
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
