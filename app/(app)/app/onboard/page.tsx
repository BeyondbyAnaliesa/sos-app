export default function OnboardPage() {
  return (
    <div className="stack">
      <section className="panel stack">
        <p className="section-eyebrow">Onboard</p>
        <h1 className="section-title">Capture birth data cleanly.</h1>
        <p className="section-copy">
          This route is ready for the V1 intake flow: profile basics, birth date, birth time certainty, and location lookup.
        </p>
      </section>

      <section className="panel stack">
        <label className="entry-label" htmlFor="birth-date">Birth date</label>
        <input className="input" id="birth-date" type="date" />
        <label className="entry-label" htmlFor="birth-time">Birth time</label>
        <input className="input" id="birth-time" type="time" />
        <label className="entry-label" htmlFor="birth-location">Birth location</label>
        <input className="input" id="birth-location" type="text" placeholder="City, state, country" />
        <button className="button" type="button">Save onboarding</button>
      </section>
    </div>
  );
}
