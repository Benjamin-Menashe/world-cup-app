"use client"

import { useState } from "react"
import { ShieldAlert, CheckCircle, AlertCircle, Loader } from "lucide-react"

export default function SyncPlayersButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSync() {
    if (!confirm("WARNING: This will consume around 50 API calls to deep scan the rosters of all 48 teams. Are you sure?")) return;

    setStatus("loading")
    setMessage("")
    try {
      const res = await fetch("/api/sync/players", {
        method: "POST",
        headers: { "x-sync-secret": "wc2026-sync-secret" },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const s = data.summary
        setMessage(
          `✅ Found ${s.teamsMatched} teams, Added ${s.playersAdded} players (Skipped ${s.playersSkipped} existing).` +
          (s.errors.length ? ` Warnings: ${s.errors.join(", ")}` : "")
        )
        setStatus("success")
      } else {
        setMessage(data.error || "Sync failed")
        setStatus("error")
      }
    } catch (err) {
      setMessage((err as Error).message || "Network error")
      setStatus("error")
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <button
        onClick={handleSync}
        disabled={status === "loading"}
        className="primary-btn"
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", maxWidth: "320px", background: "var(--red)" }}
      >
        {status === "loading" ? (
          <Loader size={16} className="spin" />
        ) : (
          <ShieldAlert size={16} />
        )}
        {status === "loading" ? "Fetching Rosters..." : "Step 2: Sync Player Rosters"}
      </button>

      {message && (
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          fontSize: "0.9rem",
          background: status === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
          border: `1px solid ${status === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          color: status === "success" ? "var(--success)" : "var(--red)",
        }}>
          {status === "success" ? <CheckCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} /> : <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />}
          {message}
        </div>
      )}
    </div>
  )
}
