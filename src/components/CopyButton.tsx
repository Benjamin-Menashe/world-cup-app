"use client"

import { useState } from "react"
import { Share2, Check } from "lucide-react"

interface CopyButtonProps {
  text: string
  label?: string
  size?: number
  style?: React.CSSProperties
}

export default function CopyButton({ text, label, size = 14, style }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : (label || "Copy to clipboard")}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? 'var(--success)' : 'var(--text-secondary)',
        fontSize: '0.8rem', fontWeight: 500, padding: '4px 8px',
        borderRadius: '6px', transition: 'all 0.2s',
        ...style,
      }}
      onMouseOver={(e) => { if (!copied) e.currentTarget.style.background = 'rgba(0,0,0,0.04)' }}
      onMouseOut={(e) => { e.currentTarget.style.background = 'none' }}
    >
      {copied ? <Check size={size} /> : <Share2 size={size} />}
      {label && <span>{copied ? "Copied!" : label}</span>}
    </button>
  )
}
