"use client"

import { useRouter } from "next/navigation"
import { setLanguageAction } from "@/app/actions/language"

interface LanguageToggleProps {
  currentLang: string
}

export default function LanguageToggle({ currentLang }: LanguageToggleProps) {
  const router = useRouter()

  const handleToggle = async () => {
    const nextLang = currentLang === 'en' ? 'he' : 'en'
    await setLanguageAction(nextLang)
    router.refresh()
  }

  return (
    <button
      onClick={handleToggle}
      className="secondary-btn"
      style={{
        padding: '4px 8px',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
        marginLeft: 'auto'
      }}
      aria-label="Toggle Language"
    >
      <span style={{ fontWeight: currentLang === 'en' ? 700 : 400, opacity: currentLang === 'en' ? 1 : 0.6 }}>En</span>
      <span style={{ fontSize: '0.6rem', opacity: 0.4 }}>|</span>
      <span style={{ fontWeight: currentLang === 'he' ? 700 : 400, opacity: currentLang === 'he' ? 1 : 0.6 }}>עב</span>
    </button>
  )
}
