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
        padding: '6px 12px',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        marginLeft: 'auto'
      }}
      aria-label="Toggle Language"
    >
      <span style={{ fontWeight: currentLang === 'en' ? 700 : 400, opacity: currentLang === 'en' ? 1 : 0.5 }}>EN</span>
      <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>|</span>
      <span style={{ fontWeight: currentLang === 'he' ? 700 : 400, opacity: currentLang === 'he' ? 1 : 0.5 }}>HE</span>
    </button>
  )
}
