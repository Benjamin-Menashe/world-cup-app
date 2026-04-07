"use client"

import CopyButton from "@/components/CopyButton"

export default function ShareRankingButton({ groupName, rank, points, totalPlayers, dict }: { groupName: string; rank: number; points: number; totalPlayers: number; dict?: any }) {
  const defaultText = `🏆 ${groupName} — World Cup 2026\n📊 Rank: #${rank} out of ${totalPlayers}\n⚡ Points: ${points}\n\nJoin me on World Cup 2026 Bet with Friends!\nhttps://world-cup-app-2026.vercel.app`
  
  const text = dict ? dict.shareRankHtml
    .replace('{groupName}', groupName)
    .replace('{rank}', rank.toString())
    .replace('{totalPlayers}', totalPlayers.toString())
    .replace('{points}', points.toString()) : defaultText

  return <CopyButton text={text} label={dict?.share || "Share"} copiedLabel={dict?.copied || "Copied!"} size={13} />
}
