'use client';

import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(ua) || iPadOS) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export default function InstallAppPanel() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const platform = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  return (
    <div className="space-y-5">
      {installed && (
        <div className="rounded-[12px] border border-[var(--color-copper)]/35 bg-[rgba(201,162,122,0.08)] px-4 py-3 text-sm text-[var(--color-text)]">
          SOS is already installed on this device.
        </div>
      )}

      {installPrompt && !installed && (
        <button
          type="button"
          onClick={install}
          className="h-[54px] w-full rounded-[10px] border border-[var(--color-copper)] bg-[rgba(201,162,122,0.08)] text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-copper)] hover:bg-[rgba(201,162,122,0.14)]"
        >
          Install SOS
        </button>
      )}

      <section className="rounded-[14px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-copper-dim)]">iPhone</p>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
          <li>1. Open this page in Safari.</li>
          <li>2. Tap the Share button.</li>
          <li>3. Tap Add to Home Screen.</li>
          <li>4. Tap Add. SOS will appear as an app icon.</li>
        </ol>
      </section>

      <section className="rounded-[14px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-copper-dim)]">Android</p>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
          <li>1. Open this page in Chrome.</li>
          <li>2. Tap Install SOS if Chrome shows it.</li>
          <li>3. Or open the browser menu and tap Install app or Add to Home screen.</li>
          <li>4. SOS will appear as an app icon.</li>
        </ol>
      </section>

      {platform === 'other' && (
        <p className="text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
          On desktop, send this page to your phone first. The phone install creates the home-screen app button.
        </p>
      )}
    </div>
  );
}
