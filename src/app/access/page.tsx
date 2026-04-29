import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getLoginRedirectPath } from '@/lib/auth/redirects';
import { getSubscription, isActive } from '@/lib/subscription';
import TesterAccessForm from './TesterAccessForm';

export default async function TesterAccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(getLoginRedirectPath('/access'));

  const sub = await getSubscription(user.id);
  if (isActive(sub)) redirect('/');

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-light tracking-[0.2em] text-[var(--color-text)]">SOS</h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Tester Access
        </p>
      </div>

      <p className="mb-6 text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
        If you were invited to test SOS, enter your access code here. This unlocks the app without Stripe checkout.
      </p>

      <TesterAccessForm />

      <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-text-muted)] opacity-50">
        Access codes are for invited testers only. Please do not share yours.
      </p>
    </main>
  );
}
