import { BookOpen, Swords, Calculator, Info } from "lucide-react"

export default function RulesPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <BookOpen color="var(--red)" /> Official Rulebook
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Welcome to the World Cup 2026 Betting Application. This document outlines the formal regulations and scoring mechanisms governing all participant predictions. Please read carefully before finalizing your submissions.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Section 1: Pre-Tournament Submissions */}
        <section className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--blue)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--blue)' }}>
            <Calculator size={24} /> Section 1: Group Stage Predictions
          </h2>
          
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} /> User Instructions
            </h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              Navigate to the <strong>Group Stage</strong> section before the tournament begins. For every group (A-L), drag and drop the four teams to predict their exact final standing (1st through 4th).
            </p>
          </div>

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>1.1 Scoring Mechanism</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            <li>Rankings are mathematically scored using the <strong>Normalized Kendall-Tau Distance</strong>.</li>
            <li>A perfectly predicted group awards a maximum of <strong>6 points</strong>. For example, predicting A, B, C, D when the result is A, B, C, D (distance 0) yields 6 points.</li>
            <li>Partial correlations yield descending points based on accuracy. For example, predicting A, C, B, D when the result is A, B, C, D (B and C swapped, distance 1) yields <strong>5 points</strong>. An exactly reversed prediction yields <strong>0 points</strong>.</li>
          </ul>

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>1.2 Stage 1 Bonuses</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li><strong>Tournament Champion:</strong> Correctly predicting the tournament winner awards <strong>8 points</strong>.</li>
            <li><strong>Golden Boot:</strong> Selecting the top goalscorer awards <strong>1 point</strong> for every actual goal they score in the tournament, plus an additional <strong>+1 bonus point</strong> if they are the overall top scorer of the tournament.</li>
            <li><strong>Undefeated Team:</strong> Predicting a team that wins all 3 group matches (finishes with 9 points) awards <strong>3 points</strong>.</li>
            <li><strong>Winless Team:</strong> Predicting a team that loses all 3 group matches (finishes with 0 points) awards <strong>3 points</strong>.</li>
          </ul>

        </section>

        {/* Section 2: Knockout Stage */}
        <section className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--green)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--success)' }}>
            <Swords size={24} /> Section 2: Knockout Stage Matches
          </h2>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} /> User Instructions
            </h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
              Once the group stage concludes, navigate to the <strong>Knockout Stage</strong> section. For each scheduled match, input the exact score you predict at the end of regular time (90 minutes). <em>Submissions lock precisely 1 hour before each match&apos;s kickoff.</em> Note that because predictions are based on the score at the end of 90 minutes, <strong>draws are possible and valid predictions</strong>, even in the knockout stage (e.g., 1-1 before extra time or penalties).
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              <strong>Important Default:</strong> If you omit a prediction for a knockout match, the system will automatically save a default prediction of <strong>0-0</strong>. You will still receive points if the actual match ends 0-0.
            </p>
          </div>

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>2.1 Match Scoring</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            <li><strong>Directional Winner:</strong> Successfully predicting the match outcome (Home Win, Away Win, or Draw) awards <strong>2 points</strong>.</li>
            <li><strong>Exact Score (Home/Away):</strong> Perfectly predicting the exact number of goals scored by a given team awards <strong>1 point</strong> per team.</li>
          </ul>
          
          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              <em>Example Calculation:</em> If a user predicts 2-1 and the match concludes 3-1:
              <br />• 2 points for correct directional winner.
              <br />• 1 point for perfectly guessing the Away team&apos;s 1 goal.
              <br />• Total Match Score = 3 points.
            </p>
          </div>

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>2.2 Knockout Bonuses</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li><strong>The Final Match:</strong> All points algorithmically earned during the conclusive World Cup Final match are automatically <strong>Multiplied by 2</strong>.</li>
          </ul>
        </section>

      </div>
    </div>
  )
}
