"use client"

import CopyButton from "@/components/CopyButton"

export default function ShareRankingButton({ groupName, rank, points, totalPlayers }: { groupName: string; rank: number; points: number; totalPlayers: number }) {
  const text = `🏆 ${groupName} — World Cup 2026\n📊 Rank: #${rank} out of ${totalPlayers}\n⚡ Points: ${points}\n\nJoin me on World Cup 2026 Bet with Friends!\nhttps://world-cup-app-2026.vercel.app`

  return <CopyButton text={text} label="Share" size={13} />
}
