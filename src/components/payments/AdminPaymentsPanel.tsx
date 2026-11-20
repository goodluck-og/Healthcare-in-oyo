import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { formatNaira, useApp } from '../../context/AppContext';
import {
  fetchAdminPaymentsApi,
  type AdminPaymentsDashboardResponse,
} from '../../services/apiClient';

export function AdminPaymentsPanel() {
  const { user } = useApp();
  const [data, setData] = useState<AdminPaymentsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadPayments = useCallback(async () => {
    if (!user.signedIn || user.role !== 'administrator') return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminPaymentsApi();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Interswitch admin ledger.');
    } finally {
      setLoading(false);
    }
  }, [user.signedIn, user.role]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    const items = data?.payments || [];
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      const matchesStatus = statusFilter === 'ALL' || p.payment_status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        p.transaction_reference.toLowerCase().includes(q) ||
        p.order_id.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.customer_email.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter]);

  if (!user.signedIn || user.role !== 'administrator') {
    return null;
  }

  return (
    <section className="rounded-2xl bg-white border border-[#272757]/15 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#505081]">
            Administrator-Only Gateway Operations · GET /api/admin/payments
          </p>
          <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2 mt-0.5">
            <CreditCard className="w-5 h-5 text-[#E8702A]" />
            Interswitch Payment Management &amp; Webhook Monitor
          </h2>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void loadPayments()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer self-start sm:self-auto"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh Ledger
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3.5 flex items-start gap-2 text-xs text-[#9C2327]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Missing Credentials Warning (Admin Only) */}
      {data && !data.configured && (
        <div className="rounded-xl bg-[#E8702A]/10 border border-[#E8702A]/30 p-4 space-y-2 text-xs text-[#7E3308]">
          <p className="font-bold text-[#0F0E47]">
            Action Required: Missing Interswitch Environment Variables ({data.environment.toUpperCase()})
          </p>
          <p>
            Configure these server-only keys in your `.env` file (never in client code):{' '}
            <span className="font-mono font-semibold">{data.missingCredentials.join(', ')}</span>.
          </p>
          <p className="text-[11px]">
            Obtain your <strong>Merchant Code</strong> and <strong>Pay Item ID</strong> from the
            Interswitch Quickteller Business / Developer Console under Payments → Web Checkout, and
            generate your <strong>Client ID</strong> &amp; <strong>Secret Key</strong> under API
            Keys.
          </p>
        </div>
      )}

      {data && data.configured && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            Interswitch {data.environment.toUpperCase()} credentials active
          </span>
          <span className="font-mono text-[11px]">
            Webhook HMAC-SHA512:{' '}
            {data.webhookSecretConfigured ? 'Configured' : 'Secret Not Set'}
          </span>
        </div>
      )}

      {/* KPI Metrics */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-3.5">
            <p className="text-[11px] text-[#505081]">Total Payments</p>
            <p className="text-xl font-bold text-[#0F0E47] tabular-nums mt-0.5">
              {data.summary.totalTransactions}
            </p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
            <p className="text-[11px] text-emerald-800">Successful (PAID)</p>
            <p className="text-xl font-bold text-emerald-900 tabular-nums mt-0.5">
              {data.summary.successfulTransactions}
            </p>
          </div>
          <div className="rounded-xl bg-[#E5484D]/8 border border-[#E5484D]/20 p-3.5">
            <p className="text-[11px] text-[#9C2327]">Failed / Cancelled</p>
            <p className="text-xl font-bold text-[#9C2327] tabular-nums mt-0.5">
              {data.summary.failedTransactions}
            </p>
          </div>
          <div className="rounded-xl bg-[#E8702A]/10 border border-[#E8702A]/25 p-3.5">
            <p className="text-[11px] text-[#7E3308]">Pending / Unconfigured</p>
            <p className="text-xl font-bold text-[#7E3308] tabular-nums mt-0.5">
              {data.summary.pendingTransactions}
            </p>
          </div>
          <div className="rounded-xl bg-[#272757] text-white p-3.5 col-span-2 lg:col-span-1">
            <p className="text-[11px] text-[#C7C8E6]">Verified Volume</p>
            <p className="text-lg font-bold tabular-nums mt-0.5 truncate">
              {formatNaira(data.summary.totalVerifiedVolumeNgn)}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8686AC] absolute left-3.5 top-3" />
          <input
            type="search"
            placeholder="Search by reference, customer name, email, or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 text-xs text-[#0F0E47]"
          />
        </div>
        <select
          aria-label="Filter payments by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 min-h-[40px] rounded-xl border border-[#272757]/20 text-xs text-[#0F0E47] bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="PAID">PAID</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="AMOUNT_MISMATCH">AMOUNT_MISMATCH</option>
          <option value="UNCONFIGURED">UNCONFIGURED</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        {filteredPayments.length === 0 ? (
          <p className="text-xs text-[#505081] py-4">
            No server-initialized Interswitch transactions match the current filter yet.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#272757]/12 text-[#505081]">
                <th className="py-2.5 pr-3">Reference</th>
                <th className="py-2.5 pr-3">Customer</th>
                <th className="py-2.5 pr-3">Order &amp; Method</th>
                <th className="py-2.5 pr-3">Date</th>
                <th className="py-2.5 pr-3 text-right">Amount</th>
                <th className="py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#272757]/8">
              {filteredPayments.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#F5F6FC]">
                  <td className="py-3 pr-3 font-mono text-[#272757] whitespace-nowrap">
                    {tx.transaction_reference}
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-[#0F0E47]">{tx.customer_name}</p>
                    <p className="text-[11px] text-[#505081]">{tx.customer_email}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <p className="font-medium text-[#0F0E47]">{tx.description}</p>
                    <p className="text-[11px] text-[#505081]">
                      {tx.payment_method} · {tx.environment}
                    </p>
                  </td>
                  <td className="py-3 pr-3 font-mono text-[11px] text-[#505081] whitespace-nowrap">
                    {tx.created_at.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-3 pr-3 text-right font-bold text-[#0F0E47] tabular-nums whitespace-nowrap">
                    {formatNaira(tx.amount_ngn)}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-md font-mono text-[10px] font-semibold ${
                        tx.payment_status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : tx.payment_status === 'PENDING'
                            ? 'bg-[#272757]/10 text-[#272757]'
                            : 'bg-[#E5484D]/12 text-[#9C2327]'
                      }`}
                    >
                      {tx.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Webhook Events Log */}
      {data && (
        <div className="pt-4 border-t border-[#272757]/10 space-y-2.5">
          <h3 className="text-sm font-semibold text-[#0F0E47] flex items-center gap-1.5">
            <Webhook className="w-4 h-4 text-[#272757]" />
            Interswitch Webhook Audit Log ({data.webhookEvents.length})
          </h3>
          {data.webhookEvents.length === 0 ? (
            <p className="text-xs text-[#505081]">
              No signed webhooks received yet at `POST /api/webhooks/interswitch`.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.webhookEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl bg-[#F5F6FC] p-3 text-xs flex flex-wrap justify-between gap-2"
                >
                  <div>
                    <span className="font-mono font-semibold text-[#272757]">{ev.event_type}</span>{' '}
                    · <span className="font-mono">{ev.transaction_reference}</span>
                    <p className="text-[11px] text-[#505081] font-mono">Event ID: {ev.event_id}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-[#0F0E47]">
                      {ev.processing_status}
                    </span>
                    <p className="text-[10px] text-[#8686AC] font-mono">
                      {ev.received_at.slice(0, 19).replace('T', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-[#505081] flex items-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#272757] shrink-0" />
            All webhooks require constant-time HMAC-SHA512 verification of `X-Interswitch-Signature`
            and deduplication by `event_id`.
          </p>
        </div>
      )}
    </section>
  );
}
