'use client';

import { useState } from 'react';
import CheckoutButton from '@/components/CheckoutButton';
import { PLANS, type BillingInterval, type PlanKey } from '@/lib/stripe';

type UpgradePricingProps = {
  nativeIOS?: boolean;
};

export default function UpgradePricing({ nativeIOS = false }: UpgradePricingProps) {
  const [memberInterval, setMemberInterval] = useState<BillingInterval>('year');

  const memberPlan: PlanKey = memberInterval === 'month' ? 'member_monthly' : 'member_annual';
  const memberConfig = PLANS[memberPlan];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(201,162,122,0.07),rgba(201,162,122,0.03))] px-6 py-6 shadow-[inset_0_1px_0_rgba(201,162,122,0.12)]">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
            Charter
          </p>
          <span className="rounded-[10px] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-copper)]">
            Locked forever
          </span>
        </div>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--color-copper)]">
          Founding access
        </p>
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
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
            <span>Locked-in $49 rate for as long as SOS exists</span>
          </li>
        </ul>

        {nativeIOS ? (
          <p className="mt-6 rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
            Charter checkout is temporarily unavailable in this iOS build while App Store purchases are being configured.
          </p>
        ) : (
          <CheckoutButton
            plan="charter_annual"
            label="Claim Charter Spot"
            className="mt-6 h-[52px] w-full rounded-[10px] border-0 bg-[linear-gradient(135deg,#f1c08b,#b9784a_48%,#8f5536)] text-sm font-bold uppercase tracking-widest text-[#140c0e] shadow-[0_12px_40px_rgba(201,120,76,0.28)] disabled:cursor-not-allowed disabled:opacity-40"
          />
        )}
      </div>

      <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
              Member
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--color-copper-dim)] opacity-80">
              Annual saves 36%
            </p>
          </div>
          <div className="inline-flex rounded-[10px] border border-[var(--color-border-subtle)] p-1 text-[10px] uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setMemberInterval('year')}
              className={`rounded-[8px] px-3 py-1 ${memberInterval === 'year' ? 'bg-[rgba(201,162,122,0.18)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
            >
              Annual
            </button>
            <button
              type="button"
              onClick={() => setMemberInterval('month')}
              className={`rounded-[8px] px-3 py-1 ${memberInterval === 'month' ? 'bg-[rgba(201,162,122,0.18)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
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
          {memberInterval === 'month' ? 'Flexible access, billed monthly.' : 'Full access, billed annually.'}
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
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--color-text-muted)]">✓</span>
            <span>Choose annual savings or monthly flexibility</span>
          </li>
        </ul>

        {nativeIOS ? (
          <p className="mt-6 rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
            Member checkout is temporarily unavailable in this iOS build while App Store purchases are being configured.
          </p>
        ) : (
          <CheckoutButton
            plan={memberPlan}
            label="Get Started"
            className="mt-6 h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-transparent text-sm font-medium uppercase tracking-widest text-[var(--color-text)] hover:border-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-40"
          />
        )}
      </div>
    </div>
  );
}
