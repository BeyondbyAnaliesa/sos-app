'use client';

import Image from 'next/image';
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
    <main className="waitlist-page">
      <div className="waitlist-atmosphere" aria-hidden="true">
        <div className="waitlist-bloom waitlist-bloom-copper" />
        <div className="waitlist-bloom waitlist-bloom-electric" />
      </div>

      <section className="hero-shell">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="wordmark">SOS</p>

            <h1 className="headline">You already know something is shifting.</h1>

            <p className="subhead">
              The pressure is real. The pattern is not random. SOS shows you what is actually
              happening, and when to move.
            </p>

            {done ? (
              <div className="form-stack">
                <p className="support-text">Be first in when the doors open.</p>
                <p className="success-text">You&apos;re in.</p>
              </div>
            ) : (
              <form className="form-stack" onSubmit={handleSubmit}>
                <div className="form-row">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="email-input"
                    aria-label="Email address"
                  />
                  <button type="submit" disabled={isSubmitting} className="cta-button">
                    {isSubmitting ? 'Saving...' : 'Save my spot'}
                  </button>
                </div>

                <p className="support-text">Be first in when the doors open.</p>
                {error ? <p className="error-text">{error}</p> : null}
              </form>
            )}
          </div>

          <div className="hero-image-wrap">
            <div className="hero-image-frame">
              <Image
                src="/brand/sos-1-container.jpeg"
                alt="Cinematic SOS system console"
                fill
                priority
                sizes="(max-width: 767px) 100vw, (max-width: 1439px) 44vw, 520px"
                className="hero-image"
              />
              <div className="hero-image-overlay" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
