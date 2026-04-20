"use client"

import { useState } from "react"

export default function FixGroupsButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = useState<string | null>(null)

  async function handleClick() {
    if (!confirm("This will make 1 API call to fix team group assignments (TBD → A/B/C…). Continue?")) return
    setStatus("loading")
    setResult(null)
    try {
      const res = await fetch("/api/sync/fix-groups", {
        method: "POST",
        headers: { "x-sync-secret": process.env.NEXT_PUBLIC_SYNC_SECRET || "wc2026-sync-secret" },
      })
      const json = await res.json()
      if (json.success || json.summary?.teamsFixed > 0) {
        setStatus("done")
        setResult(
          `✅ Fixed ${json.summary.teamsFixed} teams, ${json.summary.teamsAlreadySet} already correct.` +
          (json.summary.teamsMissingFromApi > 0 ? ` ⚠️ ${json.summary.teamsMissingFromApi} not found in API.` : "")
        )
      } else {
        setStatus("error")
        setResult(`❌ ${json.error || "Failed"} — ${json.summary?.errors?.join(", ") || "No detail"}`)
      }
    } catch (e) {
      setStatus("error")
      setResult(`❌ Network error: ${(e as Error).message}`)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="primary-btn"
        style={{ alignSelf: "flex-start", opacity: status === "loading" ? 0.7 : 1 }}
      >
        {status === "loading" ? "Fixing Groups…" : "Fix Team Groups (1 API call)"}
      </button>
      {result && (
        <p style={{
          fontSize: "0.88rem",
          color: status === "done" ? "var(--success)" : "#dc2626",
          background: status === "done" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${status === "done" ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
          padding: "0.6rem 0.9rem",
          borderRadius: "8px",
          margin: 0,
        }}>
          {result}
        </p>
      )}
    </div>
  )
}
