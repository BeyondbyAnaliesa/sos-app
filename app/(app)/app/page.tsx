import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AppHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: birthData } = await supabase
    .from('birth_data')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!birthData) {
    redirect('/app/onboard');
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <p className="section-eyebrow">Today</p>
        <h1 className="section-title">Your chart, your journal, your daily pulse.</h1>
        <p className="section-copy">
          Your birth data is saved. Next up, this surface can read live chart data, reflections, and daily transits.
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
          <p className="metric-value">Natal placements, angles, and aspects are now stored in natal_charts.</p>
        </article>
      </section>
    </div>
  );
}
