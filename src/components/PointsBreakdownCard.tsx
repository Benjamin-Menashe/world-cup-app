"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { PointBreakdown } from "@/lib/scoring"

type SectionConfig = {
  key: string
  label: string
  icon: string
  color: string
}

const SECTIONS: SectionConfig[] = [
  { key: 'bonus',    label: 'Bonus Picks',      icon: '🏆', color: '#f59e0b' },
  { key: 'group',    label: 'Group Stage',      icon: '📊', color: '#3b82f6' },
  { key: 'R32',      label: 'Round of 32',      icon: '⚔️',  color: '#8b5cf6' },
  { key: 'R16',      label: 'Round of 16',      icon: '⚔️',  color: '#8b5cf6' },
  { key: 'QF',       label: 'Quarter Finals',   icon: '⚔️',  color: '#eab308' },
  { key: 'SF',       label: 'Semi Finals',      icon: '⚔️',  color: '#ef4444' },
  { key: '3rd',      label: 'Third Place',      icon: '⚔️',  color: '#64748b' },
  { key: 'Final',    label: 'Final',            icon: '⚽',  color: '#10b981' },
]

function SectionSubtotal({ items, config, defaultOpen = true }: { items: PointBreakdown[], config: SectionConfig, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const total = items.reduce((s, i) => s + i.points, 0)

  const renderItemRow = (item: PointBreakdown, i: number, isLast: boolean) => {
    const detailParts = item.details ? item.details.split(' · ') : []
    const part1 = detailParts[0] || ''
    const part2 = detailParts[1] || ''

    return (
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1.2fr 80px', alignItems: 'center', gap: '1rem',
        padding: '0.6rem 1rem',
        background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
        borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none',
      }}>
        {/* Category */}
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.category}
        </span>

        {/* Detail Part 1 (e.g. Predicted) */}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {part1.includes('×2 Final') ? 
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{part1}</span> : 
            part1}
        </span>

        {/* Detail Part 2 (e.g. Actual) */}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {part2.includes('×2 Final') ? 
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{part2}</span> : 
            part2}
        </span>

        {/* Points Badge */}
        <div style={{ textAlign: 'right' }}>
          <span style={{ 
            fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', padding: '0.15rem 0.5rem', borderRadius: '6px',
            color: item.points > 0 ? config.color : 'var(--text-secondary)',
            background: item.points > 0 ? `${config.color}20` : 'rgba(0,0,0,0.03)',
            border: item.points > 0 ? `1px solid ${config.color}30` : '1px solid transparent'
          }}>
            {item.points > 0 ? `+${item.points}` : '0'} pts
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1rem', borderRadius: isOpen ? '8px 8px 0 0' : '8px',
          background: `${config.color}18`, border: 'none', cursor: 'pointer',
          borderBottom: isOpen ? `2px solid ${config.color}40` : `1px solid ${config.color}20`,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: config.color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          {config.icon} {config.label}
        </span>
        <span style={{ fontWeight: 800, fontSize: '1.15rem', color: config.color }}>+{total} pts</span>
      </button>

      {isOpen && (
        <div style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden', border: `1px solid ${config.color}20`, borderTop: 'none' }}>
          {items.map((item, i) => renderItemRow(item, i, i === items.length - 1))}
        </div>
      )}
    </div>
  )
}

export default function PointsBreakdownCard({ breakdown, total }: { breakdown: PointBreakdown[], total: number }) {
  if (breakdown.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
        No points yet — scores update as matches finish.
      </div>
    )
  }

  const grouped: Record<string, PointBreakdown[]> = {}
  for (const item of breakdown) {
    let groupKey = item.group as string
    if (item.group === 'specials' || item.group === 'golden_boot') groupKey = 'bonus'
    else if (item.group === 'group_rankings') groupKey = 'group'
    else if (item.group === 'knockout' && item.stage) groupKey = item.stage

    if (!grouped[groupKey]) grouped[groupKey] = []
    grouped[groupKey].push(item)
  }

  return (
    <div>
      {SECTIONS.filter(s => grouped[s.key]?.length).map((s) => (
        <SectionSubtotal key={s.key} items={grouped[s.key]} config={s} defaultOpen={false} />
      ))}

      {/* Catch-all for any untracked categories */}
      {Object.keys(grouped).filter(k => !SECTIONS.find(s => s.key === k)).map(k => (
        <SectionSubtotal 
          key={k} 
          items={grouped[k]} 
          config={{ key: k, label: k, icon: '⚽', color: '#fff' }} 
          defaultOpen={false} 
        />
      ))}

      {/* Grand total */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 1.25rem', marginTop: '1rem',
        borderRadius: '12px', background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))',
        border: '1px solid rgba(245,158,11,0.2)',
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>Total Score</span>
        <span style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--accent)' }}>{total} pts</span>
      </div>
    </div>
  )
}
