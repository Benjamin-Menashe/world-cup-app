"use client"

import CopyButton from "@/components/CopyButton"
import type { PointBreakdown } from "@/lib/scoring"

export default function ShareBreakdownButton({ breakdown, total, userName, dict }: { breakdown: PointBreakdown[]; total: number; userName: string; dict?: any }) {
  const sections: Record<string, number> = {}
  for (const item of breakdown) {
    let key = item.group as string
    if (key === 'specials' || key === 'golden_boot') key = dict?.bonusPicks || 'Bonus Picks'
    else if (key === 'group_rankings') key = dict?.groupStage || 'Group Stage'
    else if (key === 'knockout' && item.stage) key = item.stage
    else key = key.charAt(0).toUpperCase() + key.slice(1)
    sections[key] = (sections[key] || 0) + item.points
  }

  const lines = Object.entries(sections)
    .filter(([, pts]) => pts > 0)
    .map(([name, pts]) => `  ${name}: ${pts} pts`)
    .join('\n')

  const defaultText = `⚽ World Cup 2026 — ${userName}'s Points\n\n📊 Total: ${total} pts\n${lines}\n\nJoin me on World Cup 2026 Bet with Friends!\nhttps://world-cup-app-2026.vercel.app`
  const text = dict ? dict.shareBreakdown
    .replace('{userName}', userName)
    .replace('{total}', total.toString())
    .replace('{lines}', lines) : defaultText

  return <CopyButton text={text} label={dict?.share || "Share"} copiedLabel={dict?.copied || "Copied!"} size={13} />
}
