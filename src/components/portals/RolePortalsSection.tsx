import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Ambulance,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Shield,
  Smartphone,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { requestSmsOtp } from '../../services/apiClient';
import { AdminPaymentsPanel } from '../payments/AdminPaymentsPanel';

export function RolePortalsSection() {
  const {
    user,
    privateInfo,
    integrationStatus,
    resendVerificationEmail,
    refreshVerificationStatus,
    updatePrivateDetails,
    roleRequests,
    submitRoleRequest,
    auditLogs,
    doctorAppointments,
    doctorSharedBp,
    doctorSharedGlucose,
    doctorSharedDocs,
    updateAppointmentClinician,
    hospitalAppointments,
    hospitalEmergencies,
    hospitalUpdateEmergency,
    adminRoleRequests,
    adminAuditLogs,
    adminUsers,
    loadAdminUsers,
    adminReviewRoleRequest,
  } = useApp();

  const [phoneInput, setPhoneInput] = useState(privateInfo?.phone || '');
  const [addressInput, setAddressInput] = useState(privateInfo?.address || '');
  const [smsStatusMsg, setSmsStatusMsg] = useState<string | null>(null);
  const [emailStatusMsg, setEmailStatusMsg] = useState<string | null>(null);

  const [requestedRole, setRequestedRole] = useState<'doctor' | 'hospital'>('doctor');
  const [licenseRef, setLicenseRef] = useState('');
  const [organization, setOrganization] = useState('');
  const [roleStatusMsg, setRoleStatusMsg] = useState<string | null>(null);
  const [roleErrorMsg, setRoleErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [clinicalNoteDrafts, setClinicalNoteDrafts] = useState<Record<string, string>>({});
  const [partnerUnitDrafts, setPartnerUnitDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setPhoneInput(privateInfo?.phone || '');
    setAddressInput(privateInfo?.address || '');
  }, [privateInfo?.phone, privateInfo?.address]);

  useEffect(() => {
    if (user.role === 'administrator' && user.signedIn) {
      void loadAdminUsers();
    }
  }, [user.role, user.signedIn]);

  const handleSavePrivateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsStatusMsg(null);
    setBusy(true);
    try {
      await updatePrivateDetails({ phone: phoneInput, address: addressInput });
      setSmsStatusMsg('Private phone and address saved to isolated /users/{uid}/private/contact.');
    } catch (err) {
      setSmsStatusMsg(err instanceof Error ? err.message : 'Unable to save private contact details.');
    } finally {
      setBusy(false);
    }
  };

  const handleRequestSmsOtp = async () => {
    setSmsStatusMsg(null);
    setBusy(true);
    try {
      const res = await requestSmsOtp(phoneInput.trim());
      setSmsStatusMsg(res.message);
    } catch (err) {
      setSmsStatusMsg(err instanceof Error ? err.message : 'SMS provider not configured.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitRoleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleErrorMsg(null);
    setRoleStatusMsg(null);
    if (licenseRef.trim().length < 3 || organization.trim().length < 2) {
      setRoleErrorMsg('Please provide a valid MDCN / HEFAMAA license reference and organization name.');
      return;
    }
    setBusy(true);
    try {
      await submitRoleRequest({
        requestedRole,
        licenseRef: licenseRef.trim(),
        organization: organization.trim(),
      });
      setLicenseRef('');
      setOrganization('');
      setRoleStatusMsg('Verification request submitted for administrator review.');
    } catch (err) {
      setRoleErrorMsg(err instanceof Error ? err.message : 'Unable to submit verification request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Identity Verification & Isolated PII Card */}
      <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#272757]" />
              Account Verification & Isolated Contact Details
            </h2>
            <p className="text-xs text-[#505081] mt-0.5">
              Your UID: <span className="font-mono text-[#0F0E47]">{user.uid || 'Guest'}</span> · Active Role:{' '}
              <strong className="uppercase text-[#272757]">{user.role}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span
              className={`px-3 py-1 rounded-lg ${
                user.emailVerified
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-[#E8702A]/12 text-[#7E3308] border border-[#E8702A]/25'
              }`}
            >
              Email: {user.emailVerified ? 'Verified' : 'Unverified'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-[#F5F6FC] text-[#505081] border border-[#272757]/12">
              SMS OTP: {integrationStatus.smsConfigured ? 'Provider Ready' : 'Not Configured'}
            </span>
          </div>
        </div>

        {user.signedIn && !user.emailVerified && (
          <div className="rounded-xl bg-[#E8702A]/10 border border-[#E8702A]/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#7E3308]">
            <div>
              <p className="font-semibold">Verify your email to unlock Firestore writes</p>
              <p className="mt-0.5">
                Security rules require a verified email token before saving medical records, bookings, or role applications.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  await resendVerificationEmail();
                  setEmailStatusMsg('Verification email sent. Check your inbox.');
                }}
                className="px-3.5 py-2 rounded-lg bg-white border border-[#7E3308]/30 font-semibold cursor-pointer"
              >
                Resend Email
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await refreshVerificationStatus();
                  setEmailStatusMsg(
                    ok ? 'Email verified! Firestore writes unlocked.' : 'Still unverified—click the link in your inbox first.'
                  );
                }}
                className="px-3.5 py-2 rounded-lg bg-[#272757] text-white font-semibold cursor-pointer"
              >
                Refresh Status
              </button>
            </div>
          </div>
        )}

        {emailStatusMsg && (
          <p className="text-xs font-medium text-[#272757]">{emailStatusMsg}</p>
        )}

        {user.signedIn && (
          <form onSubmit={(e) => void handleSavePrivateContact(e)} className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#272757]/10">
            <div>
              <label htmlFor="priv-phone" className="block text-xs text-[#505081] mb-1">
                Phone Number (Private PII)
              </label>
              <input
                id="priv-phone"
                type="tel"
                maxLength={32}
                placeholder="+234 800 000 0000"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
              />
            </div>
            <div>
              <label htmlFor="priv-addr" className="block text-xs text-[#505081] mb-1">
                Residential / Dispatch Address (Private PII)
              </label>
              <input
                id="priv-addr"
                type="text"
                maxLength={240}
                placeholder="Bodija, Ibadan, Oyo State"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2.5 min-h-[42px] rounded-xl bg-[#272757] text-white text-xs font-semibold cursor-pointer"
              >
                Save Contact
              </button>
              <button
                type="button"
                disabled={busy || !phoneInput.trim()}
                onClick={() => void handleRequestSmsOtp()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] rounded-xl border border-[#272757]/20 text-xs font-semibold text-[#272757] hover:bg-[#F5F6FC] disabled:opacity-50 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Test SMS OTP
              </button>
            </div>
          </form>
        )}

        {smsStatusMsg && (
          <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/12 p-3 text-xs text-[#0F0E47]">
            {smsStatusMsg}
          </div>
        )}
      </section>

      {/* 2. Doctor / Hospital Verification Application */}
      {user.signedIn && user.role === 'patient' && (
        <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#E8702A]" />
              Clinician & Hospital Credential Verification
            </h2>
            <p className="text-xs text-[#505081] mt-0.5">
              Apply for a verified Doctor (MDCN) or Partner Hospital (HEFAMAA) role. Administrators review applications before granting clinical access.
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmitRoleRequest(e)} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              aria-label="Requested role"
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as 'doctor' | 'hospital')}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs bg-white"
            >
              <option value="doctor">Doctor (MDCN)</option>
              <option value="hospital">Partner Hospital (HEFAMAA)</option>
            </select>
            <input
              type="text"
              required
              maxLength={80}
              placeholder={requestedRole === 'doctor' ? 'MDCN/R/12345' : 'HEFAMAA/FAC/908'}
              value={licenseRef}
              onChange={(e) => setLicenseRef(e.target.value)}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs"
            />
            <input
              type="text"
              required
              maxLength={120}
              placeholder={requestedRole === 'doctor' ? 'Cardiology · Reddington' : 'Hospital Name & City'}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-xs"
            />
            <button
              type="submit"
              disabled={busy || !user.emailVerified}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
            >
              Submit Role Application
            </button>
          </form>

          {roleErrorMsg && (
            <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 flex items-center gap-2 text-xs text-[#9C2327]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{roleErrorMsg}</span>
            </div>
          )}
          {roleStatusMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{roleStatusMsg}</span>
            </div>
          )}

          {roleRequests.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-[#0F0E47]">Your Submitted Applications</p>
              {roleRequests.map((req) => (
                <div key={req.id} className="rounded-xl bg-[#F5F6FC] p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold uppercase text-[#272757]">{req.requestedRole}</span> · {req.organization} ({req.licenseRef})
                  </div>
                  <span className="font-mono font-semibold text-[#0F0E47] uppercase">{req.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. Doctor Portal */}
      {user.role === 'doctor' && (
        <section className="rounded-2xl bg-white border border-[#272757]/12 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#272757]" />
              Doctor Clinical Portal
            </h2>
            <span className="text-xs font-mono text-[#505081]">Doctor UID: {user.uid}</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#0F0E47]">
              Assigned Consultations ({doctorAppointments.length})
            </h3>
            {doctorAppointments.length === 0 ? (
              <p className="text-xs text-[#505081]">
                No appointments are assigned to your doctor UID yet. Patients can select your UID when booking or sharing records.
              </p>
            ) : (
              doctorAppointments.map((apt) => (
                <div key={apt.id} className="rounded-xl bg-[#F5F6FC] p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#0F0E47]">{apt.reference} · {apt.mode}</p>
                      <p className="text-[#505081]">{apt.date} · {apt.time} · Status: {apt.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void updateAppointmentClinician(
                          apt.id,
                          'Completed',
                          clinicalNoteDrafts[apt.id] || apt.clinicalNotes || 'Consultation completed.'
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#272757] text-white font-semibold cursor-pointer"
                    >
                      Mark Completed & Save Note
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Add clinical summary note..."
                    value={clinicalNoteDrafts[apt.id] ?? apt.clinicalNotes ?? ''}
                    onChange={(e) =>
                      setClinicalNoteDrafts((prev) => ({ ...prev, [apt.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#272757]/15 text-xs"
                  />
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#272757]/10 text-xs">
            <div className="rounded-xl bg-[#F5F6FC] p-4 space-y-2">
              <p className="font-bold text-[#0F0E47]">Shared BP Logs ({doctorSharedBp.length})</p>
              {doctorSharedBp.map((b) => (
                <div key={b.id} className="bg-white rounded-lg p-2.5">
                  <p className="font-semibold tabular-nums">{b.systolic}/{b.diastolic} mmHg</p>
                  <p className="text-[#505081]">{b.recordedAt}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-[#F5F6FC] p-4 space-y-2">
              <p className="font-bold text-[#0F0E47]">Shared Glucose Logs ({doctorSharedGlucose.length})</p>
              {doctorSharedGlucose.map((g) => (
                <div key={g.id} className="bg-white rounded-lg p-2.5">
                  <p className="font-semibold tabular-nums">{g.valueMgDl} mg/dL ({g.context})</p>
                  <p className="text-[#505081]">{g.recordedAt}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-[#F5F6FC] p-4 space-y-2">
              <p className="font-bold text-[#0F0E47]">Shared Documents ({doctorSharedDocs.length})</p>
              {doctorSharedDocs.map((d) => (
                <div key={d.id} className="bg-white rounded-lg p-2.5">
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-[#505081]">{d.plainSummary}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Hospital Portal */}
      {user.role === 'hospital' && (
        <section className="rounded-2xl bg-white border border-[#272757]/12 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#E5484D]" />
              Hospital Coordination & Emergency Triage Portal
            </h2>
            <span className="text-xs font-mono text-[#505081]">Facility UID: {user.uid}</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#0F0E47]">
              Active Emergency Triage Queue ({hospitalEmergencies.length})
            </h3>
            {hospitalEmergencies.length === 0 ? (
              <p className="text-xs text-[#505081]">No active emergency requests in the queue.</p>
            ) : (
              hospitalEmergencies.map((emg) => (
                <div key={emg.id} className="rounded-xl bg-[#F5F6FC] p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#0F0E47]">{emg.patientName} · {emg.type}</p>
                      <p className="text-[#505081]">{emg.locationLabel} · Stage: <strong className="uppercase">{emg.stage}</strong></p>
                      <p className="text-[#272757] mt-1">{emg.notes}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Partner EMS Unit Name"
                      value={partnerUnitDrafts[emg.id] ?? emg.partnerUnit}
                      onChange={(e) =>
                        setPartnerUnitDrafts((prev) => ({ ...prev, [emg.id]: e.target.value }))
                      }
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#272757]/15 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => void hospitalUpdateEmergency(emg.id, 'accepted', partnerUnitDrafts[emg.id])}
                      className="px-3 py-1.5 rounded-lg bg-[#272757] text-white font-semibold cursor-pointer"
                    >
                      Accept Request
                    </button>
                    <button
                      type="button"
                      onClick={() => void hospitalUpdateEmergency(emg.id, 'dispatched', partnerUnitDrafts[emg.id], 12)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E8702A] text-white font-semibold cursor-pointer"
                    >
                      <Ambulance className="w-3.5 h-3.5" /> Confirm Dispatch
                    </button>
                    <button
                      type="button"
                      onClick={() => void hospitalUpdateEmergency(emg.id, 'resolved')}
                      className="px-3 py-1.5 rounded-lg border border-[#272757]/20 bg-white text-[#0F0E47] font-semibold cursor-pointer"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-[#272757]/10">
            <h3 className="text-sm font-semibold text-[#0F0E47]">
              Facility Appointments ({hospitalAppointments.length})
            </h3>
          </div>
        </section>
      )}

      {/* 5. Administrator Governance Console */}
      {user.role === 'administrator' && (
        <section className="rounded-2xl bg-white border border-[#272757]/12 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F0E47] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#272757]" />
              Administrator Governance & Role Approvals
            </h2>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              Admin Verified
            </span>
          </div>

          {/* Pending Role Applications */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#0F0E47]">
              Clinician & Hospital Role Requests ({adminRoleRequests.length})
            </h3>
            {adminRoleRequests.length === 0 ? (
              <p className="text-xs text-[#505081]">No role verification requests submitted yet.</p>
            ) : (
              adminRoleRequests.map((req) => (
                <div key={req.id} className="rounded-xl bg-[#F5F6FC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-[#0F0E47]">
                      {req.applicantName} → <span className="uppercase">{req.requestedRole}</span>
                    </p>
                    <p className="text-[#505081]">
                      {req.organization} · License: {req.licenseRef} · Status: <strong>{req.status}</strong>
                    </p>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void adminReviewRoleRequest(req, 'approved')}
                        className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void adminReviewRoleRequest(req, 'rejected')}
                        className="px-3.5 py-2 rounded-lg bg-[#E5484D] text-white font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* User Directory */}
          <div className="space-y-2 pt-3 border-t border-[#272757]/10">
            <h3 className="text-sm font-semibold text-[#0F0E47] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#272757]" />
              Registered Platform Accounts ({adminUsers.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {adminUsers.map((u) => (
                <div key={u.uid} className="rounded-xl bg-[#F5F6FC] p-3 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#0F0E47]">{u.displayName}</p>
                    <p className="text-[#505081] font-mono text-[11px]">{u.uid}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#272757]/15 font-semibold uppercase text-[#272757]">
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Audit Logs */}
          <div className="space-y-2 pt-3 border-t border-[#272757]/10">
            <h3 className="text-sm font-semibold text-[#0F0E47]">
              Platform Immutable Audit Trail ({adminAuditLogs.length})
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {adminAuditLogs.map((log) => (
                <div key={log.id} className="rounded-lg bg-[#F5F6FC] p-3 text-xs flex justify-between gap-3">
                  <div>
                    <span className="font-mono font-semibold text-[#272757]">{log.action}</span> ·{' '}
                    <span className="text-[#0F0E47]">{log.summary}</span>
                    <p className="text-[11px] text-[#505081] font-mono mt-0.5">
                      Actor: {log.actorUid} ({log.actorRole}) · {log.targetPath}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#8686AC] shrink-0">
                    {(log.createdAt || '').slice(0, 19).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#272757]/10">
            <AdminPaymentsPanel />
          </div>
        </section>
      )}

      {/* 6. Personal Audit Log */}
      {user.signedIn && (
        <section className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-3">
          <h2 className="text-lg font-bold text-[#0F0E47]">Your Security & Access Audit Log ({auditLogs.length})</h2>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-[#505081]">
              Audit events are recorded automatically when you create health records, share data with doctors, book visits, or submit emergency requests.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl bg-[#F5F6FC] p-3 text-xs flex justify-between gap-3">
                  <div>
                    <span className="font-mono font-semibold text-[#272757]">{log.action}</span> · {log.summary}
                    <p className="text-[11px] text-[#505081] font-mono mt-0.5">{log.targetPath}</p>
                  </div>
                  <span className="text-[11px] font-mono text-[#8686AC] shrink-0">
                    {(log.createdAt || '').slice(0, 19).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
