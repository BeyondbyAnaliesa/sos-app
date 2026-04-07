type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === 'string' ? params.error : '';

  return (
    <main className="auth-page">
      <section className="auth-card stack">
        <div className="stack auth-card__copy">
          <p className="section-eyebrow">Sign up</p>
          <h1 className="section-title">Create your SOS account.</h1>
          <p className="section-copy">Start with email and password, then finish your birth data inside the app.</p>
        </div>

        <form className="stack" action="/auth/signup" method="post">
          <div className="stack form-field">
            <label className="entry-label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="stack form-field">
            <label className="entry-label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
          </div>
          <button className="button" type="submit">Create account</button>
        </form>

        {error ? <p className="error error-left">{error}</p> : null}

        <p className="support support-left">
          Already have an account? <a className="inline-link" href="/auth/login">Log in</a>
        </p>
      </section>
    </main>
  );
}
