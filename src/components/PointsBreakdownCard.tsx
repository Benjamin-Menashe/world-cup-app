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

function getSections(dict: any): SectionConfig[] {
  return [
    { key: 'bonus',    label: dict?.dashboard?.bonusPicks || 'Bonus Picks',      icon: '🏆', color: '#f59e0b' },
    { key: 'group',    label: dict?.dashboard?.groupStage || 'Group Stage',     icon: '📊', color: '#3b82f6' },
    { key: 'R32',      label: dict?.knockout?.stages?.R32 || 'Round of 32',      icon: '⚔️',  color: '#8b5cf6' },
    { key: 'R16',      label: dict?.knockout?.stages?.R16 || 'Round of 16',      icon: '⚔️',  color: '#8b5cf6' },
    { key: 'QF',       label: dict?.knockout?.stages?.QF  || 'Quarter Finals',   icon: '⚔️',  color: '#eab308' },
    { key: 'SF',       label: dict?.knockout?.stages?.SF  || 'Semi Finals',      icon: '⚔️',  color: '#ef4444' },
    { key: '3rd',      label: dict?.knockout?.stages?.['3rd'] || 'Third Place',   icon: '⚔️',  color: '#64748b' },
    { key: 'Final',    label: dict?.knockout?.stages?.Final || 'Final',          icon: '⚽',  color: '#10b981' },
  ]
}

function SectionSubtotal({ items, config, defaultOpen = true, dict, lang = 'en' }: { items: PointBreakdown[], config: SectionConfig, defaultOpen?: boolean, dict: any, lang?: string }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const total = items.reduce((s, i) => s + i.points, 0)

  const renderItemRow = (item: PointBreakdown, i: number, isLast: boolean) => {
    const detailParts = item.details ? item.details.split(' | ') : []
    
    // Translation helper
    const t = (key: string) => dict?.breakdown?.[key] || key
    
    // Part 1: Pick / Predicted
    let part1 = detailParts[0] || ''
    if (part1.startsWith('pick: ')) part1 = part1.replace('pick: ', `${t('pick')}: `).replace('hidden', t('hidden'))
    else if (part1.startsWith('predicted: ')) part1 = part1.replace('predicted: ', `${t('predicted')}: `).replace('hidden', t('hidden'))

    // Part 2: Score / Result / Status
    let part2 = detailParts[1] || ''
    if (part2.startsWith('actual: ')) part2 = part2.replace('actual: ', `${t('actual')}: `).replace('tbd', t('tbd'))
    else if (item.group === 'golden_boot') {
      const g = parseInt(part2)
      part2 = `${part2} ${g === 1 ? t('goal') : t('goals')}`
    }

    // Part 3: Suffix / Bonus / Multiplier
    let part3 = detailParts[2] || ''
    if (part3 === 'bonus') part3 = t('goalBonus')
    else if (part3 === 'final') part3 = t('finalMultiplier')
    else if (part3 === 'ok') part3 = '✓'
    else if (part3 === 'no') part3 = '✗'
    else if (part3 === 'tbd') part3 = `(${t('tbd')})`

    // Category Translation
    let cat = item.category
    if (dict?.breakdown?.[cat]) cat = dict.breakdown[cat]
    else if (cat.startsWith('group_')) cat = `${dict.home.groups} ${cat.split('_')[1]}`

    return (
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1.2fr 80px', alignItems: 'center', gap: '1rem',
        padding: '0.6rem 1rem',
        background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
        borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none',
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cat}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {part1}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {part3 && (part3 === t('finalMultiplier') || part3 === t('goalBonus')) ? 
            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{part3}</span> : 
            (part2 || part3)}
        </span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ 
            fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', padding: '0.15rem 0.5rem', borderRadius: '6px',
            color: item.points > 0 ? config.color : 'var(--text-secondary)',
            background: item.points > 0 ? `${config.color}20` : 'rgba(0,0,0,0.03)',
            border: item.points > 0 ? `1px solid ${config.color}30` : '1px solid transparent'
          }}>
            {item.points > 0 ? `+${item.points}` : '0'} {dict?.breakdown?.pts || (lang === 'he' ? 'נק\'' : 'pts')}
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
        <span style={{ fontWeight: 800, fontSize: '1.15rem', color: config.color }}>+{total} {dict?.breakdown?.pts || (lang === 'he' ? 'נק\'' : 'pts')}</span>
      </button>

      {isOpen && (
        <div style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden', border: `1px solid ${config.color}20`, borderTop: 'none' }}>
          {items.map((item, i) => renderItemRow(item, i, i === items.length - 1))}
        </div>
      )}
    </div>
  )
}

export default function PointsBreakdownCard({ breakdown, total, dict, lang = 'en' }: { breakdown: PointBreakdown[], total: number, dict?: any, lang?: string }) {
  if (breakdown.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
        {dict?.noPointsYet || "No points yet — scores update as matches finish."}
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

  const SECTIONS = getSections(dict)

  return (
    <div>
      {SECTIONS.filter(s => grouped[s.key]?.length).map((s) => (
        <SectionSubtotal key={s.key} items={grouped[s.key]} config={s} defaultOpen={false} dict={dict} lang={lang} />
      ))}

      {/* Catch-all for any untracked categories */}
      {Object.keys(grouped).filter(k => !SECTIONS.find(s => s.key === k)).map(k => (
        <SectionSubtotal 
          key={k} 
          items={grouped[k]} 
          config={{ key: k, label: k, icon: '⚽', color: '#fff' }} 
          defaultOpen={false} 
          dict={dict}
          lang={lang}
        />
      ))}

      {/* Grand total */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1rem 1.25rem', marginTop: '1rem',
        borderRadius: '12px', background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))',
        border: '1px solid rgba(245,158,11,0.2)',
      }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>{dict?.dashboard?.totalScore || (lang === 'he' ? 'סך הנקודות' : 'Total Score')}</span>
        <span style={{ fontWeight: 900, fontSize: '1.75rem', color: 'var(--accent)' }}>{total} {dict?.breakdown?.pts || (lang === 'he' ? 'נק\'' : 'pts')}</span>
      </div>
    </div>
  )
}
