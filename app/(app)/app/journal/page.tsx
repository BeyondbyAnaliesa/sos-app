export default function JournalPage() {
  return (
    <div className="stack">
      <section className="panel stack">
        <p className="section-eyebrow">Journal</p>
        <h1 className="section-title">Write what moved through you.</h1>
        <p className="section-copy">
          Entries will save to journal_entries and reflections will save to journal_reflections once Supabase is connected.
        </p>
      </section>

      <section className="panel stack">
        <textarea className="textarea" rows={8} placeholder="What are you noticing today?" />
        <div className="page-actions">
          <button className="button" type="button">Save entry</button>
          <button className="button-secondary" type="button">Generate reflection</button>
        </div>
      </section>
    </div>
  );
}
