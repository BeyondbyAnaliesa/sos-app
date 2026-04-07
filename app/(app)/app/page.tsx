export default function AppHomePage() {
  return (
    <div className="stack">
      <section className="panel stack">
        <p className="section-eyebrow">Today</p>
        <h1 className="section-title">Your chart, your journal, your daily pulse.</h1>
        <p className="section-copy">
          V1 app shell is live. Auth-gated routes are in place, and this area is ready for Supabase-backed data.
        </p>
        <div className="page-actions">
          <a className="button" href="/app/today">
            Open Today
          </a>
          <a className="button-secondary" href="/app/journal">
            Open Journal
          </a>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">Transit summary</p>
          <p className="metric-value">Daily transit cards will read from the daily_transits table.</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Natal chart</p>
          <p className="metric-value">Natal placements and aspects will persist in natal_charts.</p>
        </article>
      </section>
    </div>
  );
}
