import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LocateFixed,
  MessageSquareWarning,
  Plus,
  Send,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  dispatchEmergencySmsApi,
  type EmergencySmsDispatchResponse,
} from '../../services/apiClient';
import type { Coordinates, EmergencyContact } from '../../types/healthcare';

interface TwilioEmergencySmsPanelProps {
  patientName: string;
  bloodGroup?: string;
  allergies?: string[];
  locationLabel: string;
  coordinates: Coordinates | null;
  emergencyType: 'SOS Medical Triage' | 'Ambulance Dispatch Request' | 'Watch Critical Alert';
  notes: string;
  gpsLocking: boolean;
  onRefreshGps: () => void;
}

function buildSmsPreviewText(args: {
  patientName: string;
  emergencyType: string;
  locationLabel: string;
  coordinates: Coordinates | null;
  bloodGroup?: string;
  allergies?: string[];
  notes: string;
}): string {
  const parts: string[] = [
    `EMERGENCY (${args.emergencyType}) — HealthConnect Alert for ${args.patientName}.`,
  ];
  if (args.coordinates) {
    const lat = args.coordinates.lat.toFixed(5);
    const lng = args.coordinates.lng.toFixed(5);
    parts.push(`Last known GPS: ${lat}, ${lng} (https://maps.google.com/?q=${lat},${lng})`);
    if (args.locationLabel) {
      parts.push(`Area: ${args.locationLabel}`);
    }
  } else {
    parts.push(`Location: ${args.locationLabel}`);
  }
  const clinical: string[] = [];
  if (args.bloodGroup && args.bloodGroup !== 'Unknown') {
    clinical.push(`Blood ${args.bloodGroup}`);
  }
  const allergyText = (args.allergies || []).filter(Boolean).join(', ');
  if (allergyText && allergyText.toLowerCase() !== 'none recorded') {
    clinical.push(`Allergies: ${allergyText}`);
  }
  if (clinical.length > 0) {
    parts.push(clinical.join(' | '));
  }
  if (args.notes.trim()) {
    parts.push(`Note: ${args.notes.trim().slice(0, 140)}`);
  }
  return parts.join(' ');
}

export function TwilioEmergencySmsPanel({
  patientName,
  bloodGroup,
  allergies,
  locationLabel,
  coordinates,
  emergencyType,
  notes,
  gpsLocking,
  onRefreshGps,
}: TwilioEmergencySmsPanelProps) {
  const {
    emergencyContacts,
    addEmergencyContact,
    integrationStatus,
    navigate,
  } = useApp();

  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    emergencyContacts.slice(0, 5).map((c) => c.id)
  );
  const [sending, setSending] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<EmergencySmsDispatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick-add predefined contact inline
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Family');
  const [newPhone, setNewPhone] = useState('');
  const [addingContact, setAddingContact] = useState(false);

  // Keep selectedIds synchronized when contacts load asynchronously
  useEffect(() => {
    if (emergencyContacts.length > 0 && selectedIds.length === 0) {
      setSelectedIds(emergencyContacts.slice(0, 5).map((c) => c.id));
    }
  }, [emergencyContacts, selectedIds.length]);

  const selectedContacts: EmergencyContact[] = useMemo(
    () => emergencyContacts.filter((c) => selectedIds.includes(c.id)).slice(0, 5),
    [emergencyContacts, selectedIds]
  );

  const previewText = useMemo(
    () =>
      buildSmsPreviewText({
        patientName,
        emergencyType,
        locationLabel,
        coordinates,
        bloodGroup,
        allergies,
        notes,
      }),
    [patientName, emergencyType, locationLabel, coordinates, bloodGroup, allergies, notes]
  );

  const toggleContact = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const handleQuickAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    setAddingContact(true);
    setError(null);
    try {
      await addEmergencyContact({
        name: newName.trim(),
        relationship: newRelationship.trim() || 'Emergency Contact',
        phone: newPhone.trim(),
        city: 'Ibadan',
        isPrimary: emergencyContacts.length === 0,
      });
      setNewName('');
      setNewPhone('');
      setShowQuickAdd(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save emergency contact.');
    } finally {
      setAddingContact(false);
    }
  };

  const handleSendTwilioEmergencySms = async () => {
    if (selectedContacts.length === 0) {
      setError('Select at least one predefined emergency contact to alert.');
      return;
    }
    setSending(true);
    setError(null);
    setDispatchResult(null);
    try {
      const response = await dispatchEmergencySmsApi({
        patientName,
        emergencyType,
        locationLabel,
        coordinates,
        bloodGroup,
        allergies: (allergies || []).join(', '),
        notes: notes.trim() || undefined,
        contacts: selectedContacts.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
        })),
      });
      setDispatchResult(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to dispatch automated Emergency SMS.'
      );
    } finally {
      setSending(false);
    }
  };

  const fallbackSmsHref = useMemo(() => {
    const firstPhone = selectedContacts[0]?.phone?.replace(/[^+\d]/g, '') || '';
    const body = encodeURIComponent(dispatchResult?.messageBody || previewText);
    return `sms:${firstPhone}?body=${body}`;
  }, [selectedContacts, dispatchResult?.messageBody, previewText]);

  return (
    <section
      aria-label="Automated Twilio Emergency SMS Alert"
      className="rounded-2xl bg-white border border-[#272757]/10 p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#B91C1C] flex items-center gap-1.5">
            <MessageSquareWarning className="w-4 h-4" />
            Automated Twilio Emergency SMS · GPS Coordinates Broadcast
          </p>
          <h2 className="text-xl font-bold text-[#0F0E47] mt-0.5">
            Send &apos;Emergency&apos; SMS with Live GPS Coordinates
          </h2>
          <p className="text-xs text-[#505081] mt-1">
            Automatically text your predefined ICE contacts via Twilio with your last known GPS pin, Google Maps link, and critical medical profile.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshGps}
          disabled={gpsLocking}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-[#F5F6FC] hover:bg-[#E8EAF6] border border-[#272757]/15 text-xs font-semibold text-[#0F0E47] shrink-0 cursor-pointer disabled:opacity-60"
        >
          <LocateFixed className="w-3.5 h-3.5 text-[#E8702A]" />
          {gpsLocking ? 'Updating GPS...' : 'Refresh GPS Pin'}
        </button>
      </div>

      {/* Last Known GPS Telemetry Summary */}
      <div className="rounded-xl bg-[#F5F6FC] border border-[#272757]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <p className="text-[#505081] font-medium">Last Known GPS Coordinates Attached to SMS</p>
          <p className="font-mono font-bold text-[#0F0E47] tabular-nums mt-0.5">
            {coordinates
              ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`
              : 'GPS coordinates not yet locked — click Refresh GPS Pin'}
          </p>
          <p className="text-[#505081] mt-0.5">{locationLabel}</p>
        </div>
        <div className="text-left sm:text-right text-[11px] text-[#505081]">
          <p className="font-semibold text-[#0F0E47]">
            Twilio Gateway:{' '}
            <span
              className={
                integrationStatus.twilioConfigured ? 'text-[#15803D]' : 'text-[#B45309]'
              }
            >
              {integrationStatus.twilioConfigured
                ? 'Configured (Server-Side)'
                : 'Awaiting Server Credentials'}
            </span>
          </p>
          <p className="mt-0.5">Max 5 predefined contacts per alert</p>
        </div>
      </div>

      {/* Predefined Contacts Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#0F0E47]">
            Predefined Emergency Recipients ({selectedContacts.length}/{Math.min(5, emergencyContacts.length || 5)} selected)
          </p>
          <button
            type="button"
            onClick={() => setShowQuickAdd((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#272757] hover:text-[#E8702A] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {showQuickAdd ? 'Cancel' : 'Add Contact'}
          </button>
        </div>

        {showQuickAdd && (
          <form
            onSubmit={(e) => void handleQuickAddContact(e)}
            className="rounded-xl bg-[#F5F6FC] border border-[#272757]/15 p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2.5"
          >
            <input
              type="text"
              required
              maxLength={80}
              placeholder="Contact Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#272757]/20 text-xs"
            />
            <input
              type="text"
              maxLength={40}
              placeholder="Relationship"
              value={newRelationship}
              onChange={(e) => setNewRelationship(e.target.value)}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#272757]/20 text-xs"
            />
            <input
              type="tel"
              required
              maxLength={20}
              placeholder="+234 803 000 0000"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-white border border-[#272757]/20 text-xs font-mono"
            />
            <button
              type="submit"
              disabled={addingContact}
              className="px-3 py-2 min-h-[40px] rounded-lg bg-[#272757] hover:bg-[#0F0E47] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {addingContact ? 'Saving...' : 'Save Contact'}
            </button>
          </form>
        )}

        {emergencyContacts.length === 0 ? (
          <div className="rounded-xl bg-[#F5F6FC] border border-dashed border-[#272757]/20 p-4 text-xs text-[#505081]">
            No predefined emergency contacts on file yet. Click <strong>Add Contact</strong> above to register a family member or caregiver.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {emergencyContacts.map((contact) => {
              const checked = selectedIds.includes(contact.id);
              return (
                <label
                  key={contact.id}
                  className={`rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition-colors ${
                    checked
                      ? 'bg-[#FFF7F2] border-[#E8702A]/50'
                      : 'bg-[#F5F6FC] border-[#272757]/12 hover:border-[#272757]/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleContact(contact.id)}
                    className="w-4 h-4 accent-[#E5484D] shrink-0"
                  />
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-[#0F0E47] truncate">
                      {contact.name}
                      {contact.isPrimary ? ' · Primary' : ''}
                    </p>
                    <p className="text-[#505081] font-mono tabular-nums truncate">
                      {contact.phone} · {contact.relationship}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Live SMS Payload Preview */}
      <div className="rounded-xl bg-[#0F0E47] text-white p-4 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-[#C7C8E6]">
          <span className="font-semibold text-[#FFB585]">Automated Emergency SMS Payload Preview</span>
          <span className="font-mono tabular-nums">{previewText.length} chars</span>
        </div>
        <p className="text-xs leading-relaxed text-white/95 font-mono break-words">
          {previewText}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/30 p-3.5 text-xs text-[#9C2327] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E5484D] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Dispatch Results / Honest Configuration Notice */}
      {dispatchResult && (
        <div
          className={`rounded-xl border p-4 space-y-3 text-xs ${
            dispatchResult.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-2">
            {dispatchResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">{dispatchResult.message}</p>
              {dispatchResult.requiresAuth && (
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-[#272757] underline font-semibold cursor-pointer"
                >
                  Sign in to enable server-side Twilio dispatch →
                </button>
              )}
              {dispatchResult.missingCredentials && dispatchResult.missingCredentials.length > 0 && (
                <p className="font-mono text-[11px]">
                  Missing server env vars: {dispatchResult.missingCredentials.join(', ')}
                </p>
              )}
            </div>
          </div>

          {dispatchResult.results.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-black/10">
              {dispatchResult.results.map((r) => (
                <div
                  key={`${r.to}-${r.name}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                >
                  <span className="font-semibold">
                    {r.name} ({r.to})
                  </span>
                  <span
                    className={`font-mono ${r.sent ? 'text-emerald-700 font-semibold' : 'text-[#B91C1C]'}`}
                  >
                    {r.sent
                      ? `Sent (${r.status || 'queued'}${r.sid ? ` · ${r.sid.slice(0, 12)}` : ''})`
                      : r.error || 'Delivery failed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Primary Twilio Send Action + Native Device SMS Fallback */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={sending || selectedContacts.length === 0}
          onClick={() => void handleSendTwilioEmergencySms()}
          className="inline-flex items-center gap-2 px-5 py-3 min-h-[46px] rounded-xl bg-[#E5484D] hover:bg-[#C6363B] text-white text-sm font-bold cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {sending
            ? 'Dispatching Twilio Emergency SMS...'
            : `Send Automated Emergency SMS (${selectedContacts.length})`}
        </button>

        {selectedContacts.length > 0 && (
          <a
            href={fallbackSmsHref}
            className="inline-flex items-center gap-2 px-4 py-3 min-h-[46px] rounded-xl bg-[#F5F6FC] hover:bg-[#E8EAF6] border border-[#272757]/15 text-[#0F0E47] text-xs font-semibold"
          >
            <Smartphone className="w-4 h-4 text-[#272757]" />
            Open Native Device SMS Fallback
          </a>
        )}
      </div>
    </section>
  );
}
