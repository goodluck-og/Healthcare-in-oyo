import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  CreditCard,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import { formatNaira, useApp } from '../../context/AppContext';
import {
  initializeInterswitchWebCheckoutApi,
  verifyInterswitchReferenceApi,
  type InterswitchInlineParams,
} from '../../services/apiClient';
import type { Appointment, TransactionRecord } from '../../types/healthcare';

type CheckoutPhase =
  | 'idle'
  | 'loading'
  | 'processing'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'unconfigured';

declare global {
  interface Window {
    webpayCheckout?: (
      options: InterswitchInlineParams & {
        onComplete: (response: {
          resp?: string;
          desc?: string;
          txnref?: string;
          amount?: number;
        }) => void;
      }
    ) => void;
  }
}

function loadInterswitchScript(scriptUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Browser window unavailable.'));
      return;
    }
    if (typeof window.webpayCheckout === 'function') {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-interswitch-checkout="true"]`
    );
    if (existing) {
      if (existing.getAttribute('src') === scriptUrl) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener(
          'error',
          () => reject(new Error('Unable to load Interswitch Inline Checkout script.')),
          { once: true }
        );
        return;
      }
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.interswitchCheckout = 'true';
    script.onload = () => {
      if (typeof window.webpayCheckout === 'function') {
        resolve();
      } else {
        reject(new Error('Interswitch Inline Checkout loaded without exposing webpayCheckout().'));
      }
    };
    script.onerror = () =>
      reject(new Error('Failed to load official Interswitch Inline Checkout script.'));
    document.body.appendChild(script);
  });
}

export function CheckoutModal() {
  const {
    checkoutDraft,
    closeCheckout,
    completeDemoPayment,
    recordVerifiedInterswitchPayment,
    navigate,
    integrationStatus,
    user,
    privateInfo,
    googleSignInPending,
    signInWithGoogle,
    walletBalanceNgn,
  } = useApp();

  const [method, setMethod] = useState<TransactionRecord['method']>('Interswitch Card');
  const [phase, setPhase] = useState<CheckoutPhase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [missingCredentials, setMissingCredentials] = useState<string[]>([]);
  const [activeTxnRef, setActiveTxnRef] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{
    transaction: TransactionRecord;
    appointment?: Appointment;
    paymentMessage: string;
  } | null>(null);

  const walletBalanceRef = useRef(walletBalanceNgn);
  walletBalanceRef.current = walletBalanceNgn;

  useEffect(() => {
    setErrorMsg(null);
    setCompleted(null);
    setPhase('idle');
    setMissingCredentials([]);
    setActiveTxnRef(null);
    if (
      checkoutDraft &&
      checkoutDraft.category !== 'Wallet Top-Up' &&
      walletBalanceRef.current >= checkoutDraft.amountNgn
    ) {
      setMethod('HealthConnect Wallet');
    } else {
      setMethod('Interswitch Card');
    }
  }, [checkoutDraft]);

  useEffect(() => {
    if (
      checkoutDraft &&
      !completed &&
      phase === 'idle' &&
      method === 'HealthConnect Wallet' &&
      (checkoutDraft.category === 'Wallet Top-Up' || walletBalanceNgn < checkoutDraft.amountNgn)
    ) {
      setMethod('Interswitch Card');
    }
  }, [checkoutDraft, completed, phase, method, walletBalanceNgn]);

  if (!checkoutDraft) return null;

  const isTopUp = checkoutDraft.category === 'Wallet Top-Up';
  const canPayWithWallet = !isTopUp && walletBalanceNgn >= checkoutDraft.amountNgn;
  const isAdmin = user.role === 'administrator';
  const busy = phase === 'loading' || phase === 'processing' || phase === 'verifying';

  const handleServerVerify = async (txnRef: string) => {
    setPhase('verifying');
    setErrorMsg(null);
    try {
      const verified = await verifyInterswitchReferenceApi(txnRef);
      if (verified.verified && verified.status === 'PAID') {
        const recorded = await recordVerifiedInterswitchPayment({
          reference: verified.reference,
          method,
          amountNgn: verified.amountNgn ?? checkoutDraft.amountNgn,
          paymentMessage: verified.message,
        });
        setCompleted(recorded);
        setPhase('success');
        return;
      }

      if (verified.status === 'CANCELLED') {
        setPhase('cancelled');
        setErrorMsg(
          verified.message || 'Payment was cancelled before completion. No charge was confirmed.'
        );
        return;
      }

      setPhase('failed');
      setErrorMsg(
        verified.message ||
          'Payment could not be verified as PAID by Interswitch. Please retry or check your bank alert.'
      );
    } catch (err) {
      setPhase('failed');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to verify payment with the server. You can safely retry verification.'
      );
    }
  };

  const handlePay = async () => {
    if (!user.signedIn) {
      setErrorMsg('Please sign in to your account before making a payment.');
      return;
    }

    setErrorMsg(null);
    setMissingCredentials([]);

    // Instant HealthConnect Wallet checkout (uses refunded / topped-up wallet credit)
    if (method === 'HealthConnect Wallet') {
      setPhase('processing');
      try {
        const result = await completeDemoPayment('HealthConnect Wallet');
        setCompleted(result);
        setPhase('success');
      } catch (err) {
        setPhase('failed');
        setErrorMsg(err instanceof Error ? err.message : 'Unable to complete wallet checkout.');
      }
      return;
    }

    // Official Interswitch Web Checkout (Server Initialize -> Inline Modal -> Server Verify)
    setPhase('loading');
    try {
      const init = await initializeInterswitchWebCheckoutApi({
        orderId: checkoutDraft.orderId,
        amountNgn: checkoutDraft.amountNgn,
        category: checkoutDraft.category,
        description: checkoutDraft.title,
        method,
        customerName: user.name,
        customerPhone: privateInfo?.phone,
      });

      setActiveTxnRef(init.reference);

      if (!init.configured || !init.checkoutPayload) {
        setMissingCredentials(init.missingCredentials || []);
        setPhase('unconfigured');
        setErrorMsg(
          isAdmin
            ? init.message
            : 'Online Interswitch card/bank checkout is temporarily unavailable while merchant credentials are being finalized. Please use your HealthConnect Wallet or try again later.'
        );
        return;
      }

      await loadInterswitchScript(init.scriptUrl);

      if (typeof window.webpayCheckout !== 'function') {
        throw new Error('Interswitch Web Checkout widget is unavailable in this browser.');
      }

      setPhase('processing');
      const payload = init.checkoutPayload;

      window.webpayCheckout({
        ...payload,
        onComplete: (response) => {
          // NEVER trust frontend callback alone as proof of payment.
          // Always verify strictly on the backend via GET /api/payments/interswitch/verify/:ref.
          const code = String(response?.resp || '');
          if (code === 'Z6') {
            setPhase('cancelled');
            setErrorMsg('Checkout window was closed before completing payment.');
            return;
          }
          void handleServerVerify(payload.txn_ref);
        },
      });
    } catch (err) {
      setPhase('failed');
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to launch Interswitch Web Checkout.'
      );
    }
  };

  const handleClose = () => {
    setErrorMsg(null);
    setCompleted(null);
    setPhase('idle');
    setMissingCredentials([]);
    setActiveTxnRef(null);
    closeCheckout();
  };

  const envLabel =
    (integrationStatus.interswitchEnvironment || 'sandbox').toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0E47]/70"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-[#272757]/15 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#272757] text-white">
          <div>
            <p className="text-xs text-[#C7C8E6]">
              {integrationStatus.interswitchConfigured
                ? `Interswitch Web Checkout · ${envLabel} Mode`
                : 'HealthConnect Payments · Wallet & Interswitch Gateway'}
            </p>
            <h2 id="checkout-modal-title" className="text-base font-semibold mt-0.5">
              {completed ? 'Payment Verified & Recorded' : 'Complete Healthcare Payment'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close payment modal"
            onClick={handleClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!completed ? (
          <div className="p-6 space-y-5">
            {/* Order & Customer Summary */}
            <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#505081]">{checkoutDraft.category}</p>
                  <p className="text-sm font-semibold text-[#0F0E47] mt-0.5">
                    {checkoutDraft.title}
                  </p>
                  <p className="text-xs text-[#505081] mt-0.5">{checkoutDraft.subtitle}</p>
                </div>
                <p className="text-lg font-bold text-[#0F0E47] tabular-nums shrink-0">
                  {formatNaira(checkoutDraft.amountNgn)}
                </p>
              </div>
              {user.signedIn && (
                <div className="pt-2 border-t border-[#272757]/10 text-[11px] text-[#505081] flex flex-wrap justify-between gap-2">
                  <span>Customer: {user.name}</span>
                  <span>{user.email}</span>
                </div>
              )}
            </div>

            {!user.signedIn ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#E8702A]/12 border border-[#E8702A]/30 p-4 text-xs text-[#7E3308] leading-relaxed">
                  <strong>Sign in required for payments:</strong> You must be logged into your
                  HealthConnect Oyo State account before making a payment or confirming a booking.
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    disabled={googleSignInPending}
                    onClick={() => void signInWithGoogle()}
                    className="flex-1 px-4 py-3 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                  >
                    {googleSignInPending ? 'Signing in...' : 'Sign in with Google'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      navigate('/login');
                    }}
                    className="px-4 py-3 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm font-semibold text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
                  >
                    Email Login
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-[#272757]">
                    {isTopUp ? 'Select Interswitch Funding Channel' : 'Select Payment Method'}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {!isTopUp && (
                      <button
                        type="button"
                        disabled={!canPayWithWallet || busy}
                        onClick={() => {
                          setMethod('HealthConnect Wallet');
                          setPhase('idle');
                          setErrorMsg(null);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-colors ${
                          method === 'HealthConnect Wallet'
                            ? 'border-[#272757] bg-[#272757]/5 font-semibold text-[#0F0E47] cursor-pointer'
                            : canPayWithWallet
                              ? 'border-[#272757]/15 text-[#505081] hover:border-[#272757]/40 cursor-pointer'
                              : 'border-[#272757]/10 bg-[#F5F6FC] text-[#8686AC] cursor-not-allowed'
                        }`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <Wallet className="w-4 h-4 text-[#E8702A] shrink-0" />
                          <span className="truncate">
                            HealthConnect Wallet
                            <span className="block text-[11px] font-normal text-[#505081] tabular-nums">
                              {canPayWithWallet
                                ? `Available: ${formatNaira(walletBalanceNgn)} · Remaining after: ${formatNaira(
                                    walletBalanceNgn - checkoutDraft.amountNgn
                                  )}`
                                : `Available: ${formatNaira(walletBalanceNgn)} (insufficient for ${formatNaira(
                                    checkoutDraft.amountNgn
                                  )})`}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`text-[11px] font-semibold shrink-0 ${
                            canPayWithWallet ? 'text-[#15803D]' : 'text-[#8686AC]'
                          }`}
                        >
                          {canPayWithWallet ? 'Instant' : 'Low Balance'}
                        </span>
                      </button>
                    )}

                    {(
                      [
                        {
                          id: 'Interswitch Card',
                          label: 'Verve / Mastercard / Visa (Interswitch Inline)',
                          icon: CreditCard,
                        },
                        {
                          id: 'Interswitch Bank Transfer',
                          label: 'Pay with Bank Transfer (Interswitch NIP)',
                          icon: Building,
                        },
                        {
                          id: 'Interswitch USSD',
                          label: 'Pay via USSD (Interswitch Web Checkout)',
                          icon: Smartphone,
                        },
                      ] as const
                    ).map((item) => {
                      const Icon = item.icon;
                      const active = method === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setMethod(item.id);
                            setPhase('idle');
                            setErrorMsg(null);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-colors cursor-pointer ${
                            active
                              ? 'border-[#272757] bg-[#272757]/5 font-semibold text-[#0F0E47]'
                              : 'border-[#272757]/15 text-[#505081] hover:border-[#272757]/40'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-[#272757] shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Processing / Verifying Feedback Banner */}
                {(phase === 'loading' || phase === 'processing' || phase === 'verifying') && (
                  <div className="rounded-xl bg-[#272757]/8 border border-[#272757]/20 p-3.5 flex items-center gap-2.5 text-xs text-[#0F0E47]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#272757] shrink-0" />
                    <span>
                      {phase === 'loading'
                        ? 'Initializing secure transaction reference on the server...'
                        : phase === 'processing'
                          ? 'Complete payment inside the official Interswitch Checkout window...'
                          : `Verifying transaction ${activeTxnRef || ''} directly with Interswitch...`}
                    </span>
                  </div>
                )}

                {/* Cancelled / Failed / Unconfigured Feedback */}
                {errorMsg && (
                  <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3.5 space-y-2 text-xs text-[#9C2327]">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                    {isAdmin && missingCredentials.length > 0 && (
                      <div className="rounded-lg bg-white/80 border border-[#E5484D]/20 p-2.5 text-[11px] text-[#0F0E47] font-mono">
                        Admin Config Required: Set {missingCredentials.join(', ')} in server `.env`.
                      </div>
                    )}
                    {activeTxnRef && (phase === 'failed' || phase === 'cancelled') && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void handleServerVerify(activeTxnRef)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#272757] text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Re-check Payment Status ({activeTxnRef})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Clear Channel Context Notice */}
                {method === 'HealthConnect Wallet' ? (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 leading-relaxed">
                    <strong>Instant Wallet Checkout:</strong> Uses your refunded or pre-funded
                    HealthConnect Wallet credit with zero external gateway delay.
                  </div>
                ) : integrationStatus.interswitchConfigured ? (
                  <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/15 p-3 text-xs text-[#272757] leading-relaxed">
                    <strong>Server-Verified Interswitch Checkout ({envLabel}):</strong> Order amount
                    is calculated authoritatively on the server and confirmed via Interswitch
                    server-to-server verification before marking PAID.
                  </div>
                ) : isAdmin ? (
                  <div className="rounded-xl bg-[#E8702A]/10 border border-[#E8702A]/30 p-3 text-xs text-[#7E3308] leading-relaxed">
                    <strong>Administrator Notice:</strong> Interswitch credentials are missing from
                    server environment variables. Configure `INTERSWITCH_MERCHANT_CODE`,
                    `INTERSWITCH_PAY_ITEM_ID`, `INTERSWITCH_CLIENT_ID`, and `INTERSWITCH_SECRET_KEY`
                    in `.env` to enable live/sandbox inline checkout.
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/15 p-3 text-xs text-[#505081] leading-relaxed">
                    <strong>Payment Notice:</strong> Online Interswitch card/bank checkout requires
                    active merchant gateway configuration. You can pay immediately with your
                    HealthConnect Wallet if you have available credit.
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleClose}
                    className="px-4 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm font-medium text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handlePay()}
                    className="flex-1 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {phase === 'loading'
                      ? 'Initializing...'
                      : phase === 'processing'
                        ? 'Awaiting Interswitch...'
                        : phase === 'verifying'
                          ? 'Verifying Payment...'
                          : method === 'HealthConnect Wallet'
                            ? `Pay from Wallet · ${formatNaira(checkoutDraft.amountNgn)}`
                            : phase === 'failed' || phase === 'cancelled'
                              ? `Retry Interswitch · ${formatNaira(checkoutDraft.amountNgn)}`
                              : `Pay with Interswitch · ${formatNaira(checkoutDraft.amountNgn)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-[#0F0E47]">
                  {completed.appointment
                    ? 'Appointment Confirmed & Paid'
                    : completed.transaction.category === 'Wallet Top-Up'
                      ? 'Wallet Top-Up Credited'
                      : 'Payment Verified'}
                </h3>
                <p className="text-xs text-[#505081] mt-0.5">{completed.paymentMessage}</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#505081]">Transaction Reference</span>
                <span className="font-mono font-semibold text-[#0F0E47] tabular-nums">
                  {completed.transaction.reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#505081]">Channel</span>
                <span className="font-medium text-[#0F0E47]">{completed.transaction.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#505081]">Status</span>
                <span className="font-semibold text-emerald-700">
                  {completed.transaction.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#505081]">Amount</span>
                <span className="font-bold text-[#0F0E47] tabular-nums">
                  {formatNaira(completed.transaction.amountNgn)}
                </span>
              </div>
              {completed.appointment && (
                <>
                  <div className="flex justify-between pt-2 border-t border-[#272757]/10">
                    <span className="text-[#505081]">Appointment ID</span>
                    <span className="font-mono font-semibold text-[#0F0E47]">
                      {completed.appointment.reference}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#505081]">Schedule</span>
                    <span className="font-medium text-[#0F0E47] tabular-nums">
                      {completed.appointment.date} · {completed.appointment.time}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs font-semibold text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate('/payments');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs font-semibold text-[#272757] hover:bg-[#F5F6FC] cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                View All Receipts
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate('/dashboard');
                }}
                className="flex-1 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
