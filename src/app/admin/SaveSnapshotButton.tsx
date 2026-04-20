"use client"

import { useState, useTransition } from "react"
import { Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { saveSnapshotAction } from "@/app/actions/admin"

export function SaveSnapshotButton({
  hasSnapshot,
  snapshotDate,
}: {
  hasSnapshot: boolean
  snapshotDate: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleSave() {
    const msg = hasSnapshot
      ? `⚠️ OVERWRITE SNAPSHOT\n\nThe existing snapshot (saved ${snapshotDate ?? "previously"}) will be replaced with the current state.\n\nThe Reset button will then restore to THIS new state. Continue?`
      : `💾 SAVE SNAPSHOT\n\nThis will save the current teams, games, and players as the baseline state.\n\nAfter saving, the Reset & Exit button will restore to this state instead of wiping everything. Continue?`
    if (!confirm(msg)) return

    startTransition(async () => {
      try {
        await saveSnapshotAction()
        setResult({ ok: true, msg: "Snapshot saved! Reset will now restore to this state." })
      } catch (e) {
        setResult({ ok: false, msg: (e as Error).message })
      }
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {hasSnapshot && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          padding: "0.65rem 1rem", borderRadius: "8px",
          background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
          fontSize: "0.88rem", color: "#16a34a", fontWeight: 600,
        }}>
          <CheckCircle2 size={15} />
          Snapshot active{snapshotDate ? ` — saved ${snapshotDate}` : ""}. Reset will restore to this state.
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="primary-btn"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          {isPending ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          {hasSnapshot ? "Update Snapshot" : "Save Snapshot"}
        </button>
        {result && (
          <span style={{
            fontSize: "0.85rem", fontWeight: 600,
            color: result.ok ? "#16a34a" : "#dc2626",
            display: "flex", alignItems: "center", gap: "0.4rem",
          }}>
            {result.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {result.msg}
          </span>
        )}
      </div>
    </div>
  )
}
