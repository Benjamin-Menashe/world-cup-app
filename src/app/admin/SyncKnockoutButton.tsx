"use client"

import { useState } from "react"
import { Download, CheckCircle, AlertCircle, Loader } from "lucide-react"

export default function SyncKnockoutButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSync() {
    setStatus("loading")
    setMessage("")
    try {
      const res = await fetch("/api/sync/knockout", {
        method: "POST",
        headers: { "x-sync-secret": "wc2026-sync-secret" },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const s = data.summary
        setMessage(
          `✅ Done! Added ${s.gamesAdded} new knockout game(s). ${s.gamesSkipped} already existed.` +
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
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", maxWidth: "320px" }}
      >
        {status === "loading" ? (
          <Loader size={16} className="spin" />
        ) : (
          <Download size={16} />
        )}
        {status === "loading" ? "Fetching Knockout Matches..." : "Sync Knockout Matches from API"}
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
