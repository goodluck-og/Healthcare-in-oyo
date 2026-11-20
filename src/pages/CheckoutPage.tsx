import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CreditCard,
  ExternalLink,
  Lock,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react';
import { formatNaira, useApp } from '../context/AppContext';
import { OYO_SUBSCRIPTION_PLANS } from '../data/mockNigeriaData';
import {
  initializeInterswitchWebCheckoutApi,
  type InterswitchInitResponse,
} from '../services/apiClient';
import type { SubscriptionPlanId } from '../types/healthcare';

export const PENDING_CHECKOUT_STORAGE_KEY = 'hc_oyo_pending_checkout';

export interface PendingCheckoutSnapshot {
  reference: string;
  planId: SubscriptionPlanId;
  planName: string;
  amountNgn: number;
  environment: 'sandbox' | 'production';
  createdAt: string;
}

export function CheckoutPage() {
  const {
    user,
    privateInfo,
    activeSubscription,
    selectedCheckoutPlanId,
    setSelectedCheckoutPlanId,
    walletBalanceNgn,
    paySubscriptionWithWallet,
    navigate,
  } = useApp();

  const [initData, setInitData] = useState<InterswitchInitResponse | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletSuccessRef, setWalletSuccessRef] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const selectedPlan =
    OYO_SUBSCRIPTION_PLANS.find((p) => p.id === selectedCheckoutPlanId) ||
    OYO_SUBSCRIPTION_PLANS[0];

  const canPayWithWallet = walletBalanceNgn >= selectedPlan.priceNgn;

  const prepareInterswitchSession = useCallback(
    async (planId: SubscriptionPlanId) => {
      const plan =
        OYO_SUBSCRIPTION_PLANS.find((p) => p.id === planId) || OYO_SUBSCRIPTION_PLANS[0];
      setInitializing(true);
      setInitError(null);
      setWalletSuccessRef(null);

      try {
        const redirectUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}/payment-response`
            : 'http://localhost:3000/payment-response';

        const response = await initializeInterswitchWebCheckoutApi({
          orderId: plan.id,
          amountNgn: plan.priceNgn,
          category: 'Subscription',
          description: plan.name,
          method: 'Interswitch Card',
          customerName: user.name,
          customerPhone: privateInfo?.phone,
          siteRedirectUrl: redirectUrl,
        });
        setInitData(response);
      } catch (err) {
        setInitData(null);
        setInitError(
          err instanceof Error
            ? err.message
            : 'Could not initialize Interswitch Web Checkout. Please retry.'
        );
      } finally {
        setInitializing(false);
      }
    },
    [privateInfo?.phone, user.name]
  );

  useEffect(() => {
    void prepareInterswitchSession(selectedCheckoutPlanId);
  }, [selectedCheckoutPlanId, prepareInterswitchSession]);

  const handleInterswitchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!initData?.configured || !initData.webRedirectUrl || !initData.webRedirectFields) {
      e.preventDefault();
      setInitError('Payment session is not ready yet. Click Refresh Reference and try again.');
      return;
    }

    setSubmittingForm(true);
    if (typeof window !== 'undefined') {
      const snapshot: PendingCheckoutSnapshot = {
        reference: initData.reference,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amountNgn: initData.amountNgn,
        environment: initData.environment,
        createdAt: new Date().toISOString(),
      };
      try {
        window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Ignore sessionStorage restrictions
      }
    }
    // Allow native browser POST form submission directly to Interswitch Web Redirect URL
  };

  const handlePayWithWallet = async () => {
    setWalletBusy(true);
    setInitError(null);
    try {
      const tx = await paySubscriptionWithWallet(selectedPlan.id);
      setWalletSuccessRef(tx.reference);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Unable to complete wallet payment.');
    } finally {
      setWalletBusy(false);
    }
  };

  const fields = initData?.webRedirectFields;

  return (
    <div className="min-h-screen bg-[#F5F7FB] pb-20 pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top back navigation & concise header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate('/payments')}
              className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-[#1A1A6C]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Plans &amp; Payment History
            </button>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Subscription Checkout
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              HealthConnect Oyo State · Connected healthcare for Oyo State · Secure Interswitch Web Redirect
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Lock className="h-4 w-4 text-emerald-700" />
            <span>
              Interswitch WebPAY · {initData?.environment === 'production' ? 'Production' : 'Sandbox Test Mode'}
            </span>
          </div>
        </div>

        {walletSuccessRef && (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Subscription Activated via HealthConnect Wallet
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  {selectedPlan.name} is now active. Reference:{' '}
                  <span className="font-mono font-semibold">{walletSuccessRef}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/payments')}
                  className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  View Payment History
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="rounded-xl bg-[#1A1A6C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#131354]"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left column: Plan selection & care workflow */}
          <div className="space-y-6 lg:col-span-7">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">1. Choose Monthly Plan</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    One monthly subscription covers unlimited online consultations — no per-visit charges.
                  </p>
                </div>
                {activeSubscription.status === 'Active' && (
                  <span className="text-xs font-semibold text-emerald-700">
                    Current: {activeSubscription.maxProfiles === 5 ? 'Family of 5' : 'Individual'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {OYO_SUBSCRIPTION_PLANS.map((plan) => {
                  const isSelected = plan.id === selectedPlan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedCheckoutPlanId(plan.id)}
                      className={`flex flex-col justify-between rounded-xl border-2 p-5 text-left transition-all ${
                        isSelected
                          ? 'border-[#1A1A6C] bg-[#F4F5FD]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {plan.maxProfiles === 5 ? 'Up to 5 Profiles' : '1 Profile'}
                          </span>
                          {plan.highlighted && (
                            <span className="text-xs font-semibold text-[#1A1A6C]">
                              Netflix-Style Family
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-lg font-bold text-slate-900">{plan.shortName}</p>
                        <p className="mt-2 font-display text-3xl font-bold tracking-tight text-[#1A1A6C] tabular-nums">
                          {formatNaira(plan.priceNgn)}
                          <span className="text-sm font-medium text-slate-500"> / month</span>
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          {plan.tagline}
                        </p>
                      </div>

                      <ul className="mt-4 space-y-2 border-t border-slate-200/80 pt-4 text-xs text-slate-700">
                        {plan.features.slice(0, 3).map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* How care works under Oyo State Subscription */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">
                2. How Care Works in Oyo State
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Stethoscope className="h-4 w-4 text-[#1A1A6C]" />
                    <span>Online Doctor First</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Start every consultation online with a verified Oyo State doctor at no extra fee.
                    If an in-person physical exam is needed, you and your doctor choose the date at
                    UCH Ibadan, Adeoyo, Ring Road, or Bowen Ogbomoso.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Users className="h-4 w-4 text-[#1A1A6C]" />
                    <span>Netflix-Style Family Profiles</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    On the ₦50,000/month Family Plan, create up to 5 separate household profiles
                    (parents, spouse, children) with private vitals, records, and consultations under
                    one monthly bill.
                  </p>
                </div>
              </div>
            </section>

            {/* Optional Wallet Credit redemption if user already holds refund credits */}
            {walletBalanceNgn > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Wallet className="mt-0.5 h-5 w-5 text-[#1A1A6C]" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        HealthConnect Wallet Credit Available
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                        Balance: <strong className="text-slate-900">{formatNaira(walletBalanceNgn)}</strong>
                        {canPayWithWallet
                          ? ` — covers your ${selectedPlan.shortName} immediately.`
                          : ` — ${formatNaira(selectedPlan.priceNgn - walletBalanceNgn)} short of this plan.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canPayWithWallet || walletBusy}
                    onClick={() => void handlePayWithWallet()}
                    className="rounded-xl border border-[#1A1A6C] px-4 py-2 text-sm font-semibold text-[#1A1A6C] transition-colors hover:bg-[#1A1A6C] hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {walletBusy ? 'Applying Credit...' : `Pay ${formatNaira(selectedPlan.priceNgn)} from Wallet`}
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Right column: Official Interswitch Option 2 Web Redirect Gateway Card */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* Interswitch-styled checkout header */}
              <div className="bg-[#0B2239] px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-300">
                      Interswitch WebPAY · Option 2 Redirect
                    </p>
                    <h2 className="mt-1 text-lg font-bold">HealthConnect Oyo State</h2>
                  </div>
                  <ShieldCheck className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
                  <span className="text-xs text-slate-300">{selectedPlan.shortName} (Monthly)</span>
                  <span className="font-display text-2xl font-bold tracking-tight tabular-nums">
                    {formatNaira(selectedPlan.priceNgn)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* Billing & Interswitch Parameter Breakdown */}
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Subscriber</dt>
                    <dd className="font-medium text-slate-900">{user.name}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="truncate font-medium text-slate-900">
                      {user.email || 'member@healthconnect-oyo.ng'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Merchant Code</dt>
                    <dd className="font-mono text-xs font-semibold text-slate-900">
                      {fields?.merchant_code || (initializing ? 'Loading...' : '—')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Pay Item ID</dt>
                    <dd className="font-mono text-xs font-semibold text-slate-900">
                      {fields?.pay_item_id || (initializing ? 'Loading...' : '—')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Transaction Ref</dt>
                    <dd className="font-mono text-xs font-semibold text-slate-900">
                      {fields?.txn_ref || (initializing ? 'Generating...' : '—')}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Amount (Kobo · NGN 566)</dt>
                    <dd className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {fields ? `${fields.amount} kobo` : `${selectedPlan.priceNgn * 100} kobo`}
                    </dd>
                  </div>
                </dl>

                {initError && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                    {initError}
                  </div>
                )}

                {initData && !initData.configured && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                    <p className="font-semibold">Production Interswitch credentials required</p>
                    <p className="mt-1">
                      Missing environment variables: {initData.missingCredentials.join(', ')}.
                    </p>
                  </div>
                )}

                {/* Official Interswitch Option 2 Web Redirect HTML Form */}
                <form
                  ref={formRef}
                  method="post"
                  action={initData?.webRedirectUrl || ''}
                  onSubmit={handleInterswitchSubmit}
                  className="mt-6 space-y-3"
                >
                  {fields && (
                    <>
                      <input type="hidden" name="merchant_code" value={fields.merchant_code} />
                      <input type="hidden" name="pay_item_id" value={fields.pay_item_id} />
                      <input
                        type="hidden"
                        name="site_redirect_url"
                        value={fields.site_redirect_url}
                      />
                      <input type="hidden" name="txn_ref" value={fields.txn_ref} />
                      <input type="hidden" name="amount" value={fields.amount} />
                      <input type="hidden" name="currency" value={fields.currency} />
                      {fields.cust_name && (
                        <input type="hidden" name="cust_name" value={fields.cust_name} />
                      )}
                      {fields.cust_email && (
                        <input type="hidden" name="cust_email" value={fields.cust_email} />
                      )}
                      {fields.pay_item_name && (
                        <input type="hidden" name="pay_item_name" value={fields.pay_item_name} />
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={
                      initializing ||
                      submittingForm ||
                      !initData?.configured ||
                      !initData?.webRedirectUrl ||
                      !fields
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00425F] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#003147] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {submittingForm
                        ? 'Redirecting to Interswitch...'
                        : initializing
                          ? 'Preparing Secure Reference...'
                          : `Make Payment · ${formatNaira(selectedPlan.priceNgn)}`}
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={initializing}
                    onClick={() => void prepareInterswitchSession(selectedPlan.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${initializing ? 'animate-spin' : ''}`} />
                    Generate Fresh Transaction Reference
                  </button>
                </form>

                <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
                  You will be redirected to Interswitch&apos;s hosted WebPAY page and returned to{' '}
                  <span className="font-mono text-slate-700">/payment-response</span> for automatic
                  server-side verification.
                </p>

                {/* Sandbox test card credentials for easy verification */}
                {initData?.environment === 'sandbox' && (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Interswitch Sandbox Test Card (No Real Money Charged)
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums">
                      <span>Verve Card:</span>
                      <span className="font-semibold text-slate-900">5061050254756707864</span>
                      <span>Expiry / CVV:</span>
                      <span className="font-semibold text-slate-900">Any future · 111</span>
                      <span>PIN / OTP:</span>
                      <span className="font-semibold text-slate-900">1111 · 123456</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
