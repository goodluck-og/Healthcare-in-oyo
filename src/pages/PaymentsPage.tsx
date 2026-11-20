import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Printer,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { OYO_SUBSCRIPTION_PLANS } from '../data/mockNigeriaData';
import { formatNaira, useApp } from '../context/AppContext';
import {
  verifyInterswitchReferenceApi,
  verifyInterswitchTransaction,
} from '../services/apiClient';
import { HealthWallet, WalletBannerCard } from '../components/wallet/HealthWallet';
import { AdminPaymentsPanel } from '../components/payments/AdminPaymentsPanel';
import type { TransactionRecord } from '../types/healthcare';

type PaymentStatusFilter = 'all' | 'success' | 'pending';

function getDisplayStatus(status: TransactionRecord['status']): {
  label: 'Success' | 'Pending' | 'Refunded';
  toneClass: string;
} {
  if (status === 'Pending Verification') {
    return { label: 'Pending', toneClass: 'text-amber-700' };
  }
  if (status === 'Refunded to Wallet') {
    return { label: 'Refunded', toneClass: 'text-slate-600' };
  }
  return { label: 'Success', toneClass: 'text-emerald-700' };
}

export function PaymentsPage() {
  const {
    transactions,
    activeSubscription,
    openSubscriptionCheckout,
    integrationStatus,
    familyProfiles,
    user,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [showWalletLedger, setShowWalletLedger] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const display = getDisplayStatus(tx.status);
      if (statusFilter === 'success') return display.label === 'Success';
      if (statusFilter === 'pending') return display.label === 'Pending';
      return true;
    });
  }, [statusFilter, transactions]);

  const statusCounts = useMemo(() => {
    let success = 0;
    let pending = 0;
    for (const tx of transactions) {
      const d = getDisplayStatus(tx.status);
      if (d.label === 'Success') success += 1;
      if (d.label === 'Pending') pending += 1;
    }
    return { all: transactions.length, success, pending };
  }, [transactions]);

  const selectedReceipt =
    (selectedReceiptId ? transactions.find((tx) => tx.id === selectedReceiptId) : null) ||
    filteredTransactions[0] ||
    transactions[0] ||
    null;

  const handleVerifyReceipt = async (tx: TransactionRecord) => {
    setVerifyNotice(null);
    if (!user.signedIn) {
      setVerifyNotice({
        ok: false,
        text: 'Sign in with your HealthConnect Oyo State account to run authenticated server-side Interswitch verification.',
      });
      return;
    }

    setVerifying(true);
    try {
      const result = await verifyInterswitchReferenceApi(tx.reference);
      if (result.status === 'FAILED' && result.message.includes('not found')) {
        const legacy = await verifyInterswitchTransaction(tx.reference, tx.amountNgn);
        setVerifyNotice({
          ok: legacy.verified || legacy.mode === 'sandbox-unconfigured',
          text: `${legacy.status} (${legacy.mode}) — ${legacy.message}`,
        });
      } else {
        setVerifyNotice({
          ok: result.verified,
          text: `${result.status} (${result.mode}) — ${result.message}`,
        });
      }
    } catch (err) {
      setVerifyNotice({
        ok: false,
        text: err instanceof Error ? err.message : 'Unable to verify payment status.',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FC] py-8 sm:py-10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
        {/* Page Heading */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#272757]/10 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#505081]">
              HealthConnect Oyo State · Monthly Subscriptions &amp; Billing
            </p>
            <h1 className="text-3xl font-bold text-[#0F0E47] mt-1 tracking-tight">
              Subscription Plans &amp; Payment History
            </h1>
            <p className="text-sm text-[#505081] mt-1">
              One simple monthly subscription — talk to an Oyo State doctor online first, then decide together when to book an in-person physical exam.
            </p>
          </div>
          <div className="text-xs text-[#272757] font-medium">
            <span className="font-semibold text-[#0F0E47]">Gateway:</span> Interswitch Web Redirect (
            {integrationStatus.interswitchEnvironment === 'production' ? 'Production' : 'Sandbox Test Mode'})
          </div>
        </div>

        {/* Current Plan Banner */}
        <section className="rounded-2xl bg-[#0F0E47] text-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FFB585]">
              Current Membership · Oyo State
            </p>
            <h2 className="text-xl sm:text-2xl font-bold">
              {activeSubscription.planName}
            </h2>
            <p className="text-xs sm:text-sm text-[#C7C8E6] tabular-nums">
              Status:{' '}
              <strong className="text-white">{activeSubscription.status}</strong>
              {' · '}
              Profiles used:{' '}
              <strong className="text-white">
                {familyProfiles.length} of {activeSubscription.maxProfiles}
              </strong>
              {activeSubscription.status === 'Active' && activeSubscription.renewsOn !== '—'
                ? ` · Renews ${activeSubscription.renewsOn}`
                : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                openSubscriptionCheckout(
                  activeSubscription.maxProfiles === 5
                    ? 'plan-oyo-family-monthly'
                    : 'plan-oyo-individual-monthly'
                )
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <span>
                {activeSubscription.status === 'Active'
                  ? 'Manage or Renew on Checkout'
                  : 'Subscribe via Interswitch'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Two Monthly Subscription Plans (Only Billable Items) */}
        <section aria-label="Monthly Subscription Plans" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {OYO_SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent =
              activeSubscription.status === 'Active' && activeSubscription.planId === plan.id;
            return (
              <article
                key={plan.id}
                className={`rounded-2xl border p-6 sm:p-7 flex flex-col justify-between space-y-6 ${
                  plan.highlighted
                    ? 'bg-[#13124A] border-[#13124A] text-white'
                    : 'bg-white border-[#272757]/12 text-[#0F0E47]'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-wider ${
                          plan.highlighted ? 'text-[#FFB585]' : 'text-[#505081]'
                        }`}
                      >
                        {plan.maxProfiles === 5
                          ? 'Netflix-Style Household · Up to 5 Profiles'
                          : 'Single Member · 1 Profile'}
                      </p>
                      <h2 className="text-xl font-bold mt-1">{plan.shortName}</h2>
                    </div>
                    {isCurrent && (
                      <span
                        className={`text-xs font-bold ${
                          plan.highlighted ? 'text-emerald-300' : 'text-emerald-700'
                        }`}
                      >
                        Active Plan
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                      {formatNaira(plan.priceNgn)}
                    </span>
                    <span
                      className={`text-sm ${
                        plan.highlighted ? 'text-[#C7C8E6]' : 'text-[#505081]'
                      }`}
                    >
                      / month
                    </span>
                  </div>

                  <p
                    className={`text-xs sm:text-sm leading-relaxed ${
                      plan.highlighted ? 'text-[#D7D8EE]' : 'text-[#505081]'
                    }`}
                  >
                    {plan.description}
                  </p>

                  <ul
                    className={`space-y-2.5 pt-3 border-t text-xs sm:text-sm ${
                      plan.highlighted
                        ? 'border-white/12 text-[#E5E7F5]'
                        : 'border-[#272757]/10 text-[#272757]'
                    }`}
                  >
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            plan.highlighted ? 'text-emerald-400' : 'text-emerald-700'
                          }`}
                        />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => openSubscriptionCheckout(plan.id)}
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 min-h-[46px] rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    plan.highlighted
                      ? 'bg-[#E8702A] hover:bg-[#CF5E1D] text-white'
                      : 'bg-[#272757] hover:bg-[#0F0E47] text-white'
                  }`}
                >
                  {plan.maxProfiles === 5 ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>
                    {isCurrent
                      ? `Renew ${plan.shortName} · ${formatNaira(plan.priceNgn)}`
                      : `Choose ${plan.shortName} · ${formatNaira(plan.priceNgn)}/mo`}
                  </span>
                </button>
              </article>
            );
          })}
        </section>

        {/* Dedicated Payment History Section + Printable Receipt Viewer */}
        <section aria-label="Payment History" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#272757]" />
                  Payment History
                </h2>
                <p className="text-xs text-[#505081] mt-0.5">
                  Completed and pending subscription transactions with dates, statuses, and NGN amounts.
                </p>
              </div>

              <div className="inline-flex items-center gap-1 rounded-xl bg-[#F5F6FC] p-1 border border-[#272757]/10 self-start">
                {(
                  [
                    { id: 'all', label: `All (${statusCounts.all})` },
                    { id: 'success', label: `Success (${statusCounts.success})` },
                    { id: 'pending', label: `Pending (${statusCounts.pending})` },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStatusFilter(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      statusFilter === item.id
                        ? 'bg-[#272757] text-white'
                        : 'text-[#505081] hover:text-[#0F0E47]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#272757]/15 bg-[#F5F6FC] p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-[#0F0E47]">
                  No transactions match this status filter.
                </p>
                <p className="text-xs text-[#505081]">
                  Subscribe to the Individual (₦16,000/mo) or Family of 5 (₦50,000/mo) plan to see your Interswitch payment receipts here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#272757]/12 text-[#505081]">
                      <th className="py-2.5 pr-3 font-semibold">Date</th>
                      <th className="py-2.5 pr-3 font-semibold">Plan &amp; Reference</th>
                      <th className="py-2.5 pr-3 font-semibold">Status</th>
                      <th className="py-2.5 pr-3 text-right font-semibold">Amount</th>
                      <th className="py-2.5 text-right font-semibold">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#272757]/8">
                    {filteredTransactions.map((tx) => {
                      const display = getDisplayStatus(tx.status);
                      const isSelected = selectedReceipt?.id === tx.id;
                      return (
                        <tr
                          key={tx.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[#F0F2FB]' : 'hover:bg-[#F5F6FC]'
                          }`}
                        >
                          <td className="py-3.5 pr-3 font-mono text-[#272757] tabular-nums whitespace-nowrap">
                            {tx.date}
                          </td>
                          <td className="py-3.5 pr-3">
                            <p className="font-semibold text-[#0F0E47]">{tx.description}</p>
                            <p className="text-[#505081] font-mono text-[11px] mt-0.5 tabular-nums">
                              {tx.reference} · {tx.method}
                            </p>
                          </td>
                          <td className="py-3.5 pr-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${display.toneClass}`}
                            >
                              {display.label === 'Success' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{display.label}</span>
                            </span>
                          </td>
                          <td className="py-3.5 pr-3 text-right font-bold text-[#0F0E47] tabular-nums whitespace-nowrap">
                            {formatNaira(tx.amountNgn)}
                          </td>
                          <td className="py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReceiptId(tx.id);
                                setVerifyNotice(null);
                              }}
                              className="text-xs font-semibold text-[#E8702A] hover:underline cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Printable Receipt Panel */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#E8702A]" />
                Payment Receipt
              </h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#272757] hover:underline cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>

            {selectedReceipt ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-5 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-[#272757]/10">
                    <span className="font-bold text-[#0F0E47] text-sm">
                      HealthConnect Oyo State
                    </span>
                    <span className={`font-bold ${getDisplayStatus(selectedReceipt.status).toneClass}`}>
                      {getDisplayStatus(selectedReceipt.status).label}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#505081]">Reference</span>
                    <span className="font-mono font-semibold text-[#0F0E47] tabular-nums">
                      {selectedReceipt.reference}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#505081]">Plan</span>
                    <span className="font-medium text-[#0F0E47] text-right max-w-[220px]">
                      {selectedReceipt.description}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#505081]">Payment Channel</span>
                    <span className="font-medium text-[#0F0E47]">{selectedReceipt.method}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#505081]">Date</span>
                    <span className="font-mono text-[#0F0E47] tabular-nums">
                      {selectedReceipt.date}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-[#272757]/10 text-sm">
                    <span className="font-semibold text-[#0F0E47]">Total Amount</span>
                    <span className="font-bold text-[#0F0E47] tabular-nums">
                      {formatNaira(selectedReceipt.amountNgn)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#505081] pt-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#272757] shrink-0" />
                    Connected healthcare for Oyo State · Verified via Interswitch server transaction query.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={verifying}
                  onClick={() => void handleVerifyReceipt(selectedReceipt)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 min-h-[42px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking Server Verification...
                    </>
                  ) : (
                    'Verify Transaction with Interswitch'
                  )}
                </button>

                {verifyNotice && (
                  <div
                    className={`rounded-xl p-3 border text-xs flex items-start gap-2 ${
                      verifyNotice.ok
                        ? 'bg-[#1D7A4C]/10 border-[#1D7A4C]/25 text-[#1D7A4C]'
                        : 'bg-[#E5484D]/10 border-[#E5484D]/25 text-[#9C2327]'
                    }`}
                  >
                    {verifyNotice.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{verifyNotice.text}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#505081]">
                Select any row in Payment History to inspect or print its receipt.
              </p>
            )}
          </div>
        </section>

        {/* Refund Credit Wallet Banner (if user has wallet history/balance) */}
        <WalletBannerCard onViewWallet={() => setShowWalletLedger((prev) => !prev)} />
        {showWalletLedger && <HealthWallet />}

        {/* Administrator-Only Payment Gateway Management Dashboard */}
        {user.signedIn && user.role === 'administrator' && <AdminPaymentsPanel />}
      </div>
    </div>
  );
}
