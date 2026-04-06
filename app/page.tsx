'use client';

import { useState, FormEvent } from 'react';

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
    <div className="relative w-full h-screen overflow-hidden">
      {/* Void background with subtle animation */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-[#0E0C1E] via-[#1a1829] to-[#0E0C1E]"
        style={{
          animation: 'subtle-breathe 8s ease-in-out infinite',
          opacity: 0.95,
        }}
      />

      {/* Content container - centered */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 sm:px-8">
        <div className="w-full max-w-md text-center space-y-8 sm:space-y-12">

          {/* SOS Wordmark */}
          <h1
            className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-[0.25em] select-none"
            style={{ color: '#C9A27A' }}
          >
            SOS
          </h1>

          {/* Headline */}
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-light tracking-wide leading-relaxed"
            style={{ color: '#F4EFE8' }}
          >
            You already know something is shifting.
          </h2>

          {/* Subhead */}
          <p
            className="text-sm sm:text-base md:text-lg tracking-wide leading-relaxed"
            style={{ color: '#9A948C' }}
          >
            The pressure is real. The pattern is not random. SOS shows you what is actually happening, and when to move.
          </p>

          {/* Form or Success */}
          {done ? (
            <p
              className="text-base sm:text-lg tracking-wide"
              style={{ color: '#C9A27A' }}
            >
              You&apos;re in.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-6 py-3 sm:py-4 text-sm sm:text-base rounded-sm border-2 transition-colors duration-200"
                style={{
                  backgroundColor: '#161422',
                  color: '#F4EFE8',
                  borderColor: '#C9A27A',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#E0BC9F';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#C9A27A';
                }}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold tracking-widest uppercase transition-all duration-200 rounded-sm disabled:opacity-75 hover:opacity-90"
                style={{
                  backgroundColor: '#C9A27A',
                  color: '#0E0C1E',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#D9B28A';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#C9A27A';
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save my spot'}
              </button>

              <p
                className="text-sm tracking-wide"
                style={{ color: '#9A948C' }}
              >
                Be first in when the doors open.
              </p>

              {error && (
                <p className="text-sm" style={{ color: '#E07070' }}>
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Subtle breathing animation */}
      <style>{`
        @keyframes subtle-breathe {
          0%, 100% {
            opacity: 0.95;
          }
          50% {
            opacity: 0.98;
          }
        }
      `}</style>
    </div>
  );
}
