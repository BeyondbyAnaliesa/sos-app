export default function TodayPage() {
  return (
    <div className="stack">
      <section className="panel stack">
        <p className="section-eyebrow">Today</p>
        <h1 className="section-title">Daily transit guidance, ready for live data.</h1>
        <p className="section-copy">
          This page is the target surface for daily transit summaries and structured transit JSON from the V1 pipeline.
        </p>
      </section>

      <section className="metric-grid">
        <article className="entry-card">
          <p className="entry-label">Moon</p>
          <p className="entry-title">Placeholder for emotional weather and reflection prompts.</p>
        </article>
        <article className="entry-card">
          <p className="entry-label">Focus</p>
          <p className="entry-title">Placeholder for the key transit themes and suggested practices.</p>
        </article>
      </section>
    </div>
  );
}
