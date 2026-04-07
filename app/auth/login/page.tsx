type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === 'string' ? params.error : '';
  const message = typeof params.message === 'string' ? params.message : '';
  const next = typeof params.next === 'string' ? params.next : '/app';

  return (
    <main className="auth-page">
      <section className="auth-card stack">
        <div className="stack auth-card__copy">
          <p className="section-eyebrow">Login</p>
          <h1 className="section-title">Welcome back.</h1>
          <p className="section-copy">Sign in to open your chart, your journal, and your daily guidance.</p>
        </div>

        <form className="stack" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={next} />
          <div className="stack form-field">
            <label className="entry-label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="stack form-field">
            <label className="entry-label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required autoComplete="current-password" minLength={8} />
          </div>
          <button className="button" type="submit">Log in</button>
        </form>

        {message ? <p className="status-message">{message}</p> : null}
        {error ? <p className="error error-left">{error}</p> : null}

        <p className="support support-left">
          Need an account? <a className="inline-link" href="/auth/signup">Create one</a>
        </p>
      </section>
    </main>
  );
}
