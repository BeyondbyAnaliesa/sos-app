'use client';

import { useState, FormEvent } from 'react';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simple redirect after brief delay for UX
    setTimeout(() => {
      window.location.href = 'https://getsos.beehiiv.com';
    }, 300);
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
            className="text-2xl sm:text-3xl md:text-4xl font-light tracking-widest leading-relaxed"
            style={{ color: '#F4EFE8' }}
          >
            The map exists.
          </h2>

          {/* Subhead */}
          <p 
            className="text-sm sm:text-base md:text-lg tracking-wide leading-relaxed"
            style={{ color: '#9A948C' }}
          >
            Be first to hold it.
          </p>

          {/* Email Form */}
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
              {isSubmitting ? 'Sending...' : "I'm in."}
            </button>
          </form>
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
