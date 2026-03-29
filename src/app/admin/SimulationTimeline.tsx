"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Loader, CheckCircle, AlertCircle } from "lucide-react"

const STEPS = [
  {
    n: 0,
    label: "Master Reset",
    desc: "Clears official results, pushes entire tournament 10 days into the future. Pre-tournament state.",
    color: "#6b7280", // gray
  },
  {
    n: 1,
    label: "59min before 1st group match",
    desc: "Group picks are now LOCKED & visible. No points yet.",
    color: "#f59e0b",
  },
  {
    n: 2,
    label: "End of group stage",
    desc: "Group games finished. Bonus points awarded (Undefeated, Winless, Golden Boot). R32 bracket generated.",
    color: "#10b981",
  },
  {
    n: 3,
    label: "59min before 1st R32 match",
    desc: "First R32 match locked. Picks for that game visible to all group members.",
    color: "#3b82f6",
  },
  {
    n: 4,
    label: "1min after 1st R32 match",
    desc: "First R32 match finished (2-1). Points awarded for correct picks on that single game.",
    color: "#8b5cf6",
  },
  {
    n: 5,
    label: "End of Round of 32",
    desc: "All 16 R32 matches done. R16 bracket generated.",
    color: "#6366f1",
  },
  {
    n: 6,
    label: "End of Semi-Finals",
    desc: "R16 → QF → SF all finished. Final bracket generated.",
    color: "#ec4899",
  },
  {
    n: 7,
    label: "59min before Final",
    desc: "Final match locked. Champion picks permanently locked.",
    color: "#f43f5e",
  },
  {
    n: 8,
    label: "1min after Final — Tournament ends",
    desc: "Final finished (2-1 home win). Champion officially recorded. All points awarded.",
    color: "#ef4444",
  },
]

export default function SimulationTimeline({ adminId }: { adminId: string }) {
  const [loading, setLoading] = useState<number | null>(null)
  const [lastStep, setLastStep] = useState<number | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)
  const [error, setError] = useState("")

  async function runStep(n: number) {
    const stepObj = STEPS.find(s => s.n === n)
    if (!confirm(`Jump to Step ${n}: ${stepObj?.label}?\n\nThis will automatically reset and cumulatively run all simulation steps up to ${n}.`)) return
    
    setLoading(n); setError(""); setLog([]); setShowLog(false)
    
    try {
      let fullLog: string[] = []
      
      const resetRes = await fetch("/api/simulate", { 
        method: "POST", 
        credentials: "same-origin",
        headers: { "x-sync-secret": "wc2026-sync-secret" } 
      })
      if (!resetRes.ok) throw new Error("Master Reset failed")
      fullLog.push("--- Master Reset Complete ---", "")

      for (let i = 0; i <= n; i++) {
        const res = await fetch("/api/simulate/step", {
          method: "POST",
          credentials: "same-origin",
          headers: { "x-sync-secret": "wc2026-sync-secret", "content-type": "application/json" },
          body: JSON.stringify({ step: i, adminId }),
        })
        const data = await res.json()
        
        if (res.ok && data.success) {
          fullLog = fullLog.concat(`--- Step ${i}: ${STEPS.find(s=>s.n===i)?.label} ---`, ...(data.log ?? []), "")
        } else {
          throw new Error(data.error ?? `Step ${i} failed`)
        }
      }

      setLog(fullLog)
      setLastStep(n)
      setShowLog(true)
    } catch (e) {
      setError((e as Error).message)
      setShowLog(true)
    }
    setLoading(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Step buttons */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem" }}>
        {STEPS.map((s) => {
          const isDone = lastStep !== null && s.n <= lastStep
          const isLoading = loading === s.n
          return (
            <button
              key={s.n}
              onClick={() => runStep(s.n)}
              disabled={loading !== null}
              style={{
                display: "flex", flexDirection: "column", gap: "0.3rem",
                padding: "0.9rem 1rem", borderRadius: "10px", border: "none",
                background: isDone ? `${s.color}22` : 'rgba(0,0,0,0.02)',
                borderLeft: `3px solid ${s.color}`,
                cursor: loading !== null ? "not-allowed" : "pointer",
                textAlign: "left", opacity: loading !== null && !isLoading ? 0.6 : 1,
                transition: "background 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: s.color, letterSpacing: "0.04em" }}>
                  {isLoading ? <Loader size={12} /> : isDone ? <CheckCircle size={12} /> : `STEP ${s.n}`}
                </span>
                {isDone && !isLoading && <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>✓ ran</span>}
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>{s.label}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{s.desc}</div>
            </button>
          )
        })}
      </div>

      {/* Log / error */}
      {(log.length > 0 || error) && (
        <div>
          <button
            onClick={() => setShowLog(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.4rem" }}
          >
            {showLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {showLog ? "Hide" : "Show"} log
          </button>
          {showLog && (
            <div style={{ background: 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.82rem', lineHeight: 1.7, maxHeight: '220px', overflowY: 'auto', color: error ? '#dc2626' : '#16a34a' }}>
              {error ? `❌ ${error}` : log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>
      )}

      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
        ⚠️ <strong style={{ color: "var(--text-primary)" }}>Step 0 (Master Reset)</strong> sets up the entire simulation — teams, users, group scores, and test bets. Run it first, then advance through the timeline. Steps can be run non-sequentially for spot-testing. You are automatically added to 🧪 Simulation Group.
      </p>

      {/* Exit Simulation */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={async () => {
            if (!confirm("Are you sure you want to exit the simulation and sync back to live data?")) return
            setLoading(999); setError(""); setLog([]); setShowLog(false)
            try {
              const res = await fetch("/api/simulate/exit", {
                method: "POST",
                credentials: "same-origin",
                headers: { "x-sync-secret": "wc2026-sync-secret" }
              })
              const data = await res.json()
              if (!res.ok) throw new Error(data.error)
              setLog([data.message || "Exited simulation successfully."])
              setShowLog(true)
            } catch (e) {
              setError((e as Error).message)
              setShowLog(true)
            }
            setLoading(null)
          }}
          disabled={loading !== null}
          className="secondary-btn"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(239, 68, 68, 0.1)", color: "#dc2626", border: "1px solid rgba(239, 68, 68, 0.3)" }}
        >
          {loading === 999 ? <Loader size={16} className="spin" /> : <AlertCircle size={16} />}
          Exit Simulation & Sync Live
        </button>
      </div>
    </div>
  )
}
