"use client"

import { useState, useTransition } from "react"
import { Clock, AlertCircle, Loader2, CheckCircle2, RotateCcw, Trash2 } from "lucide-react"
import { setTimeOverrideAction, clearTimeOverrideAction, masterResetAction } from "@/app/actions/admin"

// ─── Time Override ────────────────────────────────────────────────────────────

export function TimeOverridePanel({ currentOverride }: { currentOverride: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [cleared, setCleared] = useState(false)

  function handleClear() {
    startTransition(async () => {
      await clearTimeOverrideAction()
      setCleared(true)
      setTimeout(() => setCleared(false), 2000)
    })
  }

  // Format the saved override for display
  const displayTime = currentOverride
    ? new Date(currentOverride).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {currentOverride && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.75rem 1rem", borderRadius: "8px",
          background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)",
        }}>
          <Clock size={16} color="#f59e0b" />
          <span style={{ fontSize: "0.9rem", color: "#f59e0b", fontWeight: 600 }}>
            Active override: {displayTime}
          </span>
          <button
            onClick={handleClear}
            disabled={isPending}
            title="Remove time override (use real clock)"
            style={{
              marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
              color: "#f59e0b", display: "flex", alignItems: "center", gap: "0.3rem",
              fontSize: "0.82rem", opacity: isPending ? 0.5 : 1,
            }}
          >
            {cleared ? <CheckCircle2 size={14} /> : <Trash2 size={14} />}
            {cleared ? "Cleared" : "Clear"}
          </button>
        </div>
      )}

      <form action={setTimeOverrideAction} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Set app clock to
          </label>
          <input
            type="datetime-local"
            name="timeOverride"
            required
            className="input-field"
            style={{ width: "100%" }}
          />
        </div>
        <button type="submit" className="primary-btn" style={{ whiteSpace: "nowrap" }}>
          <Clock size={14} style={{ marginRight: "0.4rem" }} />
          Apply Override
        </button>
      </form>

      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
        While active, the entire app (lock logic, bet visibility, match status) behaves as if it is this moment in time. Real clock resumes when you clear it.
      </p>
    </div>
  )
}

// ─── Master Reset Button ──────────────────────────────────────────────────────

export function MasterResetButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleReset() {
    if (!confirm(
      "⚠️ MASTER RESET\n\nThis will:\n• Delete ALL Teams & Players\n• Delete ALL Games & Schedules\n• Delete ALL User Predictions & Bets\n• Delete ALL Tournament Results\n\nAre you sure you want to completely wipe the tournament database? Users will not be deleted."
    )) return

    setLoading(true)
    setResult(null)
    try {
      await masterResetAction()
      setResult({ ok: true, msg: "Master Reset complete. All teams, players, matches, and bets have been erased." })
    } catch (e) {
      setResult({ ok: false, msg: (e as Error).message })
    }
    setLoading(false)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>
        Wipes the entire database including all teams, players, matches, and bets. Use this when you want to return to a clean slate before fetching real API data.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={handleReset}
          disabled={loading}
          className="secondary-btn"
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(239, 68, 68, 0.1)", color: "#dc2626",
            border: "1px solid rgba(239, 68, 68, 0.3)",
          }}
        >
          {loading ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}
          Reset & Exit — Undo All Changes
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

export function DeleteFormWithConfirm({ action, hiddenValue, hiddenName, itemLabel, confirmMessage }: { action: any, hiddenValue: string, hiddenName: string, itemLabel: string, confirmMessage: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(confirmMessage)) e.preventDefault() }}>
      <input type="hidden" name={hiddenName} value={hiddenValue} />
      <button type="submit" style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', opacity: 0.6 }} title={`Delete ${itemLabel}`}>
        🗑
      </button>
    </form>
  )
}
