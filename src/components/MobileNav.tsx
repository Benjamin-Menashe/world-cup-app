"use client"

import { useState } from "react"
import Link from "next/link"
import { Home, LayoutList, Users, Swords, BarChart2, Menu, X } from "lucide-react"

interface MobileNavProps {
  userId: string | null
  isAdmin: boolean
  logoutAction: () => Promise<void>
}

export default function MobileNav({ userId, isAdmin, logoutAction }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        className="mobile-menu-btn"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop nav links — always visible on desktop, hidden on mobile */}
      <div className="nav-links desktop-nav">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Home size={18} /> Home</Link>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart2 size={18} /> My Points</Link>
        <Link href="/bets/group-stage" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LayoutList size={18} /> Group Picks</Link>
        <Link href="/bets/knockout" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Swords size={18} /> Knockout Picks</Link>
        <Link href="/group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={18} /> Friends</Link>
        <Link href="/rules" style={{ color: 'var(--text-secondary)' }}>Rules</Link>
        {isAdmin && <Link href="/admin" style={{ color: 'var(--accent)' }}>Admin Panel</Link>}
        {userId ? (
          <form action={logoutAction}>
            <button type="submit" className="secondary-btn" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>Sign Out</button>
          </form>
        ) : (
          <Link href="/login" className="primary-btn" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>Sign In</Link>
        )}
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="mobile-nav-overlay" onClick={() => setOpen(false)}>
          <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <Link href="/" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Home size={20} /> Home</Link>
            <Link href="/dashboard" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><BarChart2 size={20} /> My Points</Link>
            <Link href="/bets/group-stage" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><LayoutList size={20} /> Group Picks</Link>
            <Link href="/bets/knockout" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Swords size={20} /> Knockout Picks</Link>
            <Link href="/group" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Users size={20} /> Friends</Link>
            <Link href="/rules" onClick={() => setOpen(false)} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>Rules</Link>
            {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>Admin Panel</Link>}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              {userId ? (
                <form action={logoutAction}>
                  <button type="submit" className="secondary-btn" style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }} onClick={() => setOpen(false)}>Sign Out</button>
                </form>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="primary-btn" style={{ display: 'block', textAlign: 'center', padding: '10px', fontSize: '0.95rem' }}>Sign In</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
