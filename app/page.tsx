'use client';

import { FormEvent, useState } from 'react';

const submittedEmails = new Set<string>();

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || isSubmitting || submittedEmails.has(normalizedEmail)) {
      if (submittedEmails.has(normalizedEmail)) {
        setDone(true);
      }
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': normalizedEmail,
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (res.ok) {
        submittedEmails.add(normalizedEmail);
        setDone(true);
      } else {
        setError('Something went wrong. Try again.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page">
      <div className="page__inner">
        <p className="wordmark fade-in delay-1">SOS</p>

        <p className="tagline fade-in delay-2">You already know something is shifting.</p>

        {done ? (
          <p className="success fade-in delay-3">You&apos;re in.</p>
        ) : (
          <>
            <form className="form fade-in delay-3" onSubmit={handleSubmit}>
              <input
                id="email-input"
                className="input"
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Email address"
              />
              <button className="button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'SAVING...' : 'SAVE MY SPOT'}
              </button>
            </form>

            {error ? <p className="error">Something went wrong. Try again.</p> : null}
          </>
        )}

        <p className={`support fade-in ${done ? 'delay-4' : 'delay-4'}`}>
          Be first in when the doors open.
        </p>
      </div>
    </main>
  );
}
