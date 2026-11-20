import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  RefreshCcw,
  Wallet,
} from 'lucide-react';
import { formatNaira, useApp } from '../../context/AppContext';

type LedgerFilter = 'all' | 'credit' | 'debit';

export function HealthWallet() {
  const { walletBalanceNgn, walletTransactions, openSubscriptionCheckout } = useApp();
  const [filter, setFilter] = useState<LedgerFilter>('all');

  const { totalRefunded, totalCredits, totalDebits, filteredEntries } = useMemo(() => {
    let refunded = 0;
    let credits = 0;
    let debits = 0;

    for (const tx of walletTransactions) {
      if (tx.type === 'credit') {
        credits += tx.amountNgn;
        if (tx.source === 'Appointment Refund') {
          refunded += tx.amountNgn;
        }
      } else {
        debits += tx.amountNgn;
      }
    }

    const filtered = walletTransactions.filter((tx) => {
      if (filter === 'credit') return tx.type === 'credit';
      if (filter === 'debit') return tx.type === 'debit';
      return true;
    });

    return {
      totalRefunded: refunded,
      totalCredits: credits,
      totalDebits: debits,
      filteredEntries: filtered,
    };
  }, [walletTransactions, filter]);

  return (
    <div className="space-y-6">
      {/* Main Balance & Subscription Credit Card */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#505081]">
              HealthConnect Oyo State Wallet · Refund Credits for Monthly Subscriptions
            </p>
            <h2 className="text-xl font-bold text-[#0F0E47] mt-0.5 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#E8702A]" />
              Available Wallet Credit
            </h2>
          </div>

          <button
            type="button"
            onClick={() => openSubscriptionCheckout()}
            className="px-4 py-2.5 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer self-start md:self-auto whitespace-nowrap"
          >
            Apply Toward Monthly Plan
          </button>
        </div>

        {/* Balance & Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 py-4 border-y border-[#272757]/10">
          <div>
            <p className="text-xs text-[#505081]">Available Credit</p>
            <p className="text-3xl font-bold text-[#0F0E47] tabular-nums mt-1">
              {formatNaira(walletBalanceNgn)}
            </p>
            <p className="text-xs text-[#505081] mt-0.5">
              Redeemable on Subscription Checkout
            </p>
          </div>

          <div>
            <p className="text-xs text-[#505081]">Refunded Credits</p>
            <p className="text-2xl font-bold text-[#15803D] tabular-nums mt-1">
              {formatNaira(totalRefunded)}
            </p>
            <p className="text-xs text-[#505081] tabular-nums mt-0.5">
              Total credited: {formatNaira(totalCredits)}
            </p>
          </div>

          <div>
            <p className="text-xs text-[#505081]">Applied to Plans</p>
            <p className="text-2xl font-bold text-[#0F0E47] tabular-nums mt-1">
              {formatNaira(totalDebits)}
            </p>
            <p className="text-xs text-[#505081] tabular-nums mt-0.5">
              {walletTransactions.length}{' '}
              {walletTransactions.length === 1 ? 'ledger entry' : 'ledger entries'}
            </p>
          </div>
        </div>

        {/* Subscription-Only Policy Callout */}
        <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-4 flex items-start gap-3 text-xs text-[#0F0E47]">
          <Info className="w-4 h-4 text-[#E8702A] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Subscription-Only Billing:</strong> HealthConnect Oyo State no longer charges
            per-visit consultation or top-up fees. Any existing refund credit in your wallet can be
            applied directly toward your Individual (₦16,000/mo) or Family of 5 (₦50,000/mo) plan on
            the Subscription Checkout page.
          </p>
        </div>
      </section>

      {/* Wallet Ledger */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0F0E47] flex items-center gap-2">
              <RefreshCcw className="w-4 h-4 text-[#272757]" />
              Wallet Credit &amp; Refund Ledger
            </h3>
            <p className="text-xs text-[#505081] mt-0.5">
              Immutable record of historical refunds and subscription credit redemptions.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F5F6FC] border border-[#272757]/10 self-start">
            {(
              [
                { id: 'all', label: 'All Activity' },
                { id: 'credit', label: 'Credits' },
                { id: 'debit', label: 'Redemptions' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === tab.id
                    ? 'bg-[#272757] text-white'
                    : 'text-[#505081] hover:text-[#0F0E47]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-xl bg-[#F5F6FC] border border-dashed border-[#272757]/20 py-10 px-6 text-center space-y-2">
            <p className="text-sm font-semibold text-[#0F0E47]">
              No wallet ledger entries yet
            </p>
            <p className="text-xs text-[#505081] max-w-md mx-auto">
              Any refund credits or wallet subscription redemptions will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#272757]/10 border-t border-[#272757]/10">
            {filteredEntries.map((entry) => {
              const isCredit = entry.type === 'credit';
              return (
                <div
                  key={entry.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCredit
                          ? 'bg-emerald-50 text-[#15803D]'
                          : 'bg-[#F5F6FC] text-[#272757]'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F0E47] leading-snug">
                        {entry.description}
                      </p>
                      <p className="text-xs text-[#505081] mt-0.5">
                        <span>{entry.source}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums">{entry.reference}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums">{entry.date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 pl-11 sm:pl-0">
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        isCredit ? 'text-[#15803D]' : 'text-[#0F0E47]'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatNaira(entry.amountNgn)}
                    </p>
                    <p className="text-[11px] text-[#505081]">
                      {isCredit ? 'Credit to wallet' : 'Applied to subscription'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function WalletBannerCard({
  onViewWallet,
}: {
  onViewWallet?: () => void;
}) {
  const { walletBalanceNgn, walletTransactions, openSubscriptionCheckout } = useApp();
  const refundCount = walletTransactions.filter((t) => t.source === 'Appointment Refund').length;

  return (
    <section className="rounded-2xl bg-white border border-[#272757]/10 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1">
        <p className="text-xs text-[#505081] flex items-center gap-1.5 font-semibold">
          <Wallet className="w-4 h-4 text-[#E8702A]" />
          HealthConnect Wallet Credit
        </p>
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-2xl font-bold text-[#0F0E47] tabular-nums">
            {formatNaira(walletBalanceNgn)}
          </p>
          <span className="text-xs text-[#505081] tabular-nums">
            {refundCount > 0
              ? `${refundCount} refund credit${refundCount === 1 ? '' : 's'} available for monthly plans`
              : 'Existing refund credits can be applied toward your monthly subscription'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {walletBalanceNgn > 0 && (
          <button
            type="button"
            onClick={() => openSubscriptionCheckout()}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            Redeem on Checkout
          </button>
        )}
        {onViewWallet && (
          <button
            type="button"
            onClick={onViewWallet}
            className="px-4 py-2 min-h-[40px] rounded-xl bg-[#F5F6FC] hover:bg-[#E7E9F8] border border-[#272757]/15 text-[#0F0E47] text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            Toggle Credit Ledger
          </button>
        )}
      </div>
    </section>
  );
}
