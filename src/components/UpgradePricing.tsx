'use client';

import { useState } from 'react';
import CheckoutButton from '@/components/CheckoutButton';
import { PLANS, type BillingInterval, type PlanKey } from '@/lib/stripe';

export default function UpgradePricing() {
  const [memberInterval, setMemberInterval] = useState<BillingInterval>('year');

  const memberPlan: PlanKey = memberInterval === 'month' ? 'member_monthly' : 'member_annual';
  const memberConfig = PLANS[memberPlan];

  return (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
            Charter Member
          </p>
          <span className="rounded-[10px] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-copper)]">
            Best value
          </span>
        </div>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-light text-[var(--color-text)]">${PLANS.charter_annual.price}</span>
          <span className="text-sm text-[var(--color-text-muted)]">/ year</span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {PLANS.charter_annual.description}
        </p>

        <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
            <span>Full natal chart — all 10 planets, houses, aspects</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
            <span>Transit calendar — 30-day view of what&apos;s coming</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
            <span>Daily AI guidance tailored to your chart</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
            <span>Unlimited journaling with astrological context</span>
          </li>
        </ul>

        <CheckoutButton
          plan="charter_annual"
          label={`Start for $${PLANS.charter_annual.price}/yr`}
          className="mt-6 h-[52px] w-full rounded-[10px] border border-[var(--color-border)] bg-transparent text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] hover:border-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>

      <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
            Member
          </p>
          <div className="inline-flex rounded-[10px] border border-[var(--color-border-subtle)] p-1 text-[10px] uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setMemberInterval('year')}
              className={`rounded-[8px] px-3 py-1 ${memberInterval === 'year' ? 'bg-[var(--color-border)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
            >
              Annual
            </button>
            <button
              type="button"
              onClick={() => setMemberInterval('month')}
              className={`rounded-[8px] px-3 py-1 ${memberInterval === 'month' ? 'bg-[var(--color-border)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
            >
              Monthly
            </button>
          </div>
        </div>

        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-light text-[var(--color-text)]">${memberConfig.price}</span>
          <span className="text-sm text-[var(--color-text-muted)]">/ {memberInterval === 'month' ? 'month' : 'year'}</span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)] opacity-60">
          {memberConfig.description}
        </p>

        <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-muted)]">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-text-muted)]">✓</span>
            <span>Full natal chart — all 10 planets, houses, aspects</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-text-muted)]">✓</span>
            <span>Transit calendar — 30-day view of what&apos;s coming</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-text-muted)]">✓</span>
            <span>Daily AI guidance tailored to your chart</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-text-muted)]">✓</span>
            <span>Unlimited journaling with astrological context</span>
          </li>
        </ul>

        <CheckoutButton
          plan={memberPlan}
          label={`Start for ${memberInterval === 'month' ? '$12.99/mo' : '$99/yr'}`}
          className="mt-6 h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-transparent text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>
    </div>
  );
}
