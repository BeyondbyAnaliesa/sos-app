import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === 'string' ? params.error : '';
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: birthData } = await supabase
    .from('birth_data')
    .select('id, birth_date, time_exact, time_value, location_text')
    .eq('user_id', user.id)
    .maybeSingle();

  if (birthData) {
    redirect('/app');
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <p className="section-eyebrow">Onboarding</p>
        <h1 className="section-title">Add your birth details.</h1>
        <p className="section-copy">
          We&apos;ll geocode your birth city, generate your natal chart, and save everything to your account.
        </p>
      </section>

      <section className="panel stack">
        <form className="stack" action="/app/onboard" method="post">
          <div className="stack form-field">
            <label className="entry-label" htmlFor="birthDate">Birth date</label>
            <input className="input" id="birthDate" name="birthDate" type="date" required />
          </div>

          <div className="stack form-field">
            <label className="entry-label" htmlFor="birthTime">Birth time</label>
            <input className="input" id="birthTime" name="birthTime" type="time" />
          </div>

          <label className="checkbox-row" htmlFor="timeUnknown">
            <input id="timeUnknown" name="timeUnknown" type="checkbox" />
            <span className="body-copy">I don&apos;t know the exact birth time.</span>
          </label>

          <div className="stack form-field">
            <label className="entry-label" htmlFor="locationText">Birth location</label>
            <input
              className="input"
              id="locationText"
              name="locationText"
              type="text"
              placeholder="City, state, country"
              required
            />
          </div>

          <button className="button" type="submit">Save and continue</button>
        </form>

        {error ? <p className="error error-left">{error}</p> : null}
      </section>
    </div>
  );
}
