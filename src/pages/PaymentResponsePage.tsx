import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Printer,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { formatNaira, useApp } from '../context/AppContext';
import {
  verifyInterswitchReferenceApi,
  type InterswitchVerifyResponse,
} from '../services/apiClient';
import type { SubscriptionPlanId } from '../types/healthcare';
import {
  PENDING_CHECKOUT_STORAGE_KEY,
  type PendingCheckoutSnapshot,
} from './CheckoutPage';

function readPendingSnapshot(): PendingCheckoutSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCheckoutSnapshot;
  } catch {
    return null;
  }
}

export function PaymentResponsePage() {
  const { authLoading, firebaseUser, navigate, recordSubscriptionPayment } = useApp();

  const [snapshot] = useState<PendingCheckoutSnapshot | null>(() => readPendingSnapshot());
  const [queryParams] = useState(() => {
    if (typeof window === 'undefined') {
      return { txnref: '', resp: '', desc: '', payRef: '' };
    }
    const sp = new URLSearchParams(window.location.search);
    return {
      txnref: sp.get('txnref') || sp.get('txn_ref') || sp.get('ref') || '',
      resp: sp.get('resp') || sp.get('responseCode') || '',
      desc: sp.get('desc') || sp.get('respDesc') || '',
      payRef: sp.get('payRef') || '',
    };
  });

  const reference = queryParams.txnref || snapshot?.reference || '';

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<InterswitchVerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recordedRef = useRef<string | null>(null);

  const inferPlanId = (orderId?: string, amountNgn?: number): SubscriptionPlanId => {
    if (orderId === 'plan-oyo-family-monthly') return 'plan-oyo-family-monthly';
    if (orderId === 'plan-oyo-individual-monthly') return 'plan-oyo-individual-monthly';
    if (snapshot?.planId) return snapshot.planId;
    if ((amountNgn || 0) >= 50000) return 'plan-oyo-family-monthly';
    return 'plan-oyo-individual-monthly';
  };

  const runVerification = useCallback(async () => {
    if (!reference) {
      setErrorMessage(
        'No transaction reference was found in the callback URL. Return to Payment History or Checkout.'
      );
      return;
    }

    setVerifying(true);
    setErrorMessage(null);
    try {
      const result = await verifyInterswitchReferenceApi(reference);
      setVerifyResult(result);

      const planId = inferPlanId(result.orderId, result.amountNgn || snapshot?.amountNgn);
      const finalAmount =
        result.amountNgn ||
        snapshot?.amountNgn ||
        (planId === 'plan-oyo-family-monthly' ? 50000 : 16000);

      if (result.verified && result.status === 'PAID' && recordedRef.current !== `${reference}:PAID`) {
        recordedRef.current = `${reference}:PAID`;
        await recordSubscriptionPayment({
          planId,
          reference,
          method: 'Interswitch Card',
          amountNgn: finalAmount,
          status: 'Verified',
        });
        try {
          window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
        } catch {
          // Ignore storage errors
        }
      } else if (
        result.status === 'PENDING' &&
        recordedRef.current !== `${reference}:PENDING` &&
        recordedRef.current !== `${reference}:PAID`
      ) {
        recordedRef.current = `${reference}:PENDING`;
        await recordSubscriptionPayment({
          planId,
          reference,
          method: 'Interswitch Card',
          amountNgn: finalAmount,
          status: 'Pending Verification',
        });
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to verify payment status with Interswitch right now.'
      );
    } finally {
      setVerifying(false);
    }
  }, [recordSubscriptionPayment, reference, snapshot?.amountNgn, snapshot?.planId]);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) return;
    if (!reference) return;
    void runVerification();
  }, [authLoading, firebaseUser, reference, runVerification]);

  const isSuccess = verifyResult?.verified && verifyResult.status === 'PAID';
  const isPending = verifyResult?.status === 'PENDING';
  const isFailed =
    verifyResult &&
    (verifyResult.status === 'FAILED' ||
      verifyResult.status === 'CANCELLED' ||
      verifyResult.status === 'AMOUNT_MISMATCH' ||
      verifyResult.status === 'UNCONFIGURED');

  const displayAmount = verifyResult?.amountNgn || snapshot?.amountNgn || 0;
  const displayPlanName =
    snapshot?.planName ||
    (inferPlanId(verifyResult?.orderId, displayAmount) === 'plan-oyo-family-monthly'
      ? 'Family Plan (Up to 5 Profiles) — Oyo State'
      : 'Individual Plan — Oyo State');

  return (
    <div className="min-h-screen bg-[#F5F7FB] pb-20 pt-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Header strip */}
          <div className="border-b border-slate-200 bg-[#0B2239] px-6 py-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-300">
                  HealthConnect Oyo State · Payment Response
                </p>
                <h1 className="mt-1 font-display text-xl font-bold">
                  Interswitch Transaction Verification
                </h1>
              </div>
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {authLoading ? (
              <div className="py-10 text-center">
                <RefreshCw className="mx-auto h-7 w-7 animate-spin text-[#1A1A6C]" />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  Restoring your HealthConnect Oyo State session...
                </p>
              </div>
            ) : !firebaseUser ? (
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div className="text-sm text-amber-950">
                    <p className="font-semibold">Sign in to complete server-side verification</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      Interswitch returned reference{' '}
                      <span className="font-mono font-semibold">{reference || 'N/A'}</span>. Sign
                      in to your account so our server can verify this payment and activate your
                      monthly subscription.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A6C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#131354]"
                >
                  Sign In to Verify Payment
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : verifying ? (
              <div className="py-10 text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#1A1A6C]" />
                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  Verifying with Interswitch...
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Checking reference <span className="font-mono font-semibold">{reference}</span>{' '}
                  via server-side transaction query.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status summary */}
                {isSuccess && (
                  <div className="flex items-start gap-3.5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                    <div>
                      <p className="text-base font-bold text-emerald-950">
                        Payment Successful — Subscription Active
                      </p>
                      <p className="mt-1 text-sm text-emerald-800">
                        {verifyResult.message ||
                          'Your monthly HealthConnect Oyo State subscription is verified and active.'}
                      </p>
                    </div>
                  </div>
                )}

                {isPending && (
                  <div className="flex items-start gap-3.5 rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <Clock className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
                    <div>
                      <p className="text-base font-bold text-amber-950">
                        Payment Pending Confirmation
                      </p>
                      <p className="mt-1 text-sm text-amber-900">
                        {verifyResult.message ||
                          'Interswitch has not yet confirmed final settlement. Your transaction is saved in Payment History as Pending.'}
                      </p>
                    </div>
                  </div>
                )}

                {(isFailed || errorMessage) && !isSuccess && !isPending && (
                  <div className="flex items-start gap-3.5 rounded-xl border border-rose-200 bg-rose-50 p-5">
                    <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-700" />
                    <div>
                      <p className="text-base font-bold text-rose-950">
                        Payment Not Completed
                      </p>
                      <p className="mt-1 text-sm text-rose-800">
                        {errorMessage ||
                          verifyResult?.message ||
                          queryParams.desc ||
                          'The Interswitch payment could not be verified as paid.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Receipt table */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Transaction Receipt
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        isSuccess
                          ? 'text-emerald-700'
                          : isPending
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {isSuccess ? 'Success' : isPending ? 'Pending' : 'Not Completed'}
                    </span>
                  </div>

                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Plan</dt>
                      <dd className="text-right font-semibold text-slate-900">{displayPlanName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Reference</dt>
                      <dd className="font-mono text-xs font-semibold text-slate-900">
                        {reference || '—'}
                      </dd>
                    </div>
                    {displayAmount > 0 && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Amount</dt>
                        <dd className="font-bold text-slate-900 tabular-nums">
                          {formatNaira(displayAmount)}
                        </dd>
                      </div>
                    )}
                    {(verifyResult?.responseCode || queryParams.resp) && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Gateway Code</dt>
                        <dd className="font-mono text-xs font-medium text-slate-800">
                          {verifyResult?.responseCode || queryParams.resp}
                        </dd>
                      </div>
                    )}
                    {verifyResult?.verifiedAt && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Verified At</dt>
                        <dd className="text-xs text-slate-700 tabular-nums">
                          {new Date(verifyResult.verifiedAt).toLocaleString('en-NG')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate('/payments')}
                      className="rounded-xl bg-[#1A1A6C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#131354]"
                    >
                      View Payment History
                    </button>
                    {isSuccess ? (
                      <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Go to Dashboard
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/checkout')}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Return to Checkout
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSuccess && reference && (
                      <button
                        type="button"
                        onClick={() => void runVerification()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-check Status
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Receipt
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
