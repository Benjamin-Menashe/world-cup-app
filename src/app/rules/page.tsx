import { BookOpen, Swords, Calculator, Info } from "lucide-react"
import { getDictionary } from "@/lib/i18n"

export default async function RulesPage() {
  const dict = await getDictionary()
  const d = dict.rules

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          <BookOpen color="var(--red)" /> {d.pageTitle}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
          {d.pageDesc}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        
        {/* Section 1: Pre-Tournament Submissions */}
        <section className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--blue)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--blue)' }}>
            <Calculator size={24} /> {d.section1Title}
          </h2>
          
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} /> {d.s1InstructionsTitle}
            </h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }} dangerouslySetInnerHTML={{ __html: d.s1Instructions }} />
          </div>

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{d.s1ScoringTitle}</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            <li dangerouslySetInnerHTML={{ __html: d.s1Scoring1 }} />
            <li dangerouslySetInnerHTML={{ __html: d.s1Scoring2 }} />
            <li dangerouslySetInnerHTML={{ __html: d.s1Scoring3 }} />
          </ul>

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{d.s1BonusTitle}</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li dangerouslySetInnerHTML={{ __html: d.s1BonusChamp }} />
            <li dangerouslySetInnerHTML={{ __html: d.s1BonusBoot }} />
            <li dangerouslySetInnerHTML={{ __html: d.s1BonusUndefeated }} />
            <li dangerouslySetInnerHTML={{ __html: d.s1BonusWinless }} />
          </ul>

        </section>

        {/* Section 2: Knockout Stage */}
        <section className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--green)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--success)' }}>
            <Swords size={24} /> {d.section2Title}
          </h2>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} /> {d.s2InstructionsTitle}
            </h3>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.75rem' }} dangerouslySetInnerHTML={{ __html: d.s2Instructions1 }} />
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.75rem' }} dangerouslySetInnerHTML={{ __html: d.s2Instructions2 }} />
            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }} dangerouslySetInnerHTML={{ __html: d.s2Instructions3 }} />
          </div>

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{d.s2ScoringTitle}</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            <li dangerouslySetInnerHTML={{ __html: d.s2Scoring1 }} />
            <li dangerouslySetInnerHTML={{ __html: d.s2Scoring2 }} />
          </ul>
          
          <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }} dangerouslySetInnerHTML={{ __html: d.s2Example }} />
          </div>

          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{d.s2BonusTitle}</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li dangerouslySetInnerHTML={{ __html: d.s2BonusFinal }} />
          </ul>
        </section>

      </div>
    </div>
  )
}
