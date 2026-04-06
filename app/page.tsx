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
    <main className="hero">
      <div className="hero__atmosphere" aria-hidden="true">
        <div className="hero__bloom hero__bloom--copper" />
        <div className="hero__bloom hero__bloom--electric" />
        <div className="hero__grain" />
      </div>

      <section className="hero__inner">
        <div className="hero__copy">
          <p className="hero__wordmark">SOS</p>

          <h1 className="hero__headline">You already know something is shifting.</h1>

          <p className="hero__subhead">
            The pressure is real. The pattern is not random. SOS shows you what is actually
            happening, and when to move.
          </p>

          {done ? (
            <div className="hero__form-state">
              <p className="hero__support">Be first in when the doors open.</p>
              <p className="hero__success">You&apos;re in.</p>
            </div>
          ) : (
            <>
              <label className="hero__label" htmlFor="email-input">EMAIL</label>
              <form className="hero__form" onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="hero__input"
                  id="email-input"
                />
                <button type="submit" disabled={isSubmitting} className="hero__button">
                  {isSubmitting ? 'Saving...' : 'Save my spot'}
                </button>
              </form>

              <p className="hero__support">Be first in when the doors open.</p>
              {error ? <p className="hero__error">{error}</p> : null}
            </>
          )}
        </div>

        <div className="hero__image-wrap">
          <Image
            src="/brand/sos-1-container.jpeg"
            alt="Cinematic SOS system console"
            fill
            priority
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 460px, 520px"
            className="hero__image"
          />
        </div>
      </section>
    </main>
  );
}
