import React, { useState } from 'react';
import { LocateFixed, MapPin, X, AlertCircle } from 'lucide-react';
import { NIGERIA_CITY_PRESETS } from '../../data/mockNigeriaData';
import { useApp } from '../../context/AppContext';

export function LocationModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { userLocation, setUserLocation } = useApp();
  const [manualAddress, setManualAddress] = useState('');
  const [selectedCity, setSelectedCity] = useState('Ibadan');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!open) return null;

  const requestBrowserGps = () => {
    setGpsError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Browser geolocation is unavailable on this device. Please enter your address manually below.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setUserLocation({
          label: `Browser GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          source: 'gps',
        });
        onClose();
      },
      () => {
        setGpsLoading(false);
        setGpsError(
          'Location permission was declined or timed out. Select an Oyo State town or enter your street address below.'
        );
      },
      { enableHighAccuracy: false, timeout: 7000 }
    );
  };

  const applyManualLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const preset = NIGERIA_CITY_PRESETS[selectedCity] || NIGERIA_CITY_PRESETS.Ibadan;
    const label = manualAddress.trim()
      ? `${manualAddress.trim()}, ${selectedCity}`
      : preset.label;
    setUserLocation({
      label,
      coordinates: { lat: preset.lat, lng: preset.lng },
      source: 'manual',
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F0E47]/65"
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#272757]/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#272757]/10">
          <div>
            <h2 id="location-modal-title" className="text-base font-bold text-[#0F0E47]">
              Set Your Location
            </h2>
            <p className="text-xs text-[#505081] mt-0.5">Current: {userLocation.label}</p>
          </div>
          <button
            type="button"
            aria-label="Close location modal"
            onClick={onClose}
            className="p-2 rounded-lg text-[#505081] hover:bg-[#F5F6FC] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <button
              type="button"
              disabled={gpsLoading}
              onClick={requestBrowserGps}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[46px] rounded-xl bg-[#272757] hover:bg-[#0F0E47] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <LocateFixed className="w-4 h-4" />
              <span>{gpsLoading ? 'Requesting Browser GPS...' : 'Allow Browser GPS Location'}</span>
            </button>
            <p className="text-[11px] text-[#505081] leading-relaxed">
              We only request browser geolocation when you tap this button. Coordinates are used strictly to calculate distances to nearby clinics and pharmacies.
            </p>
          </div>

          {gpsError && (
            <div className="rounded-xl bg-[#E5484D]/10 border border-[#E5484D]/25 p-3 flex items-start gap-2 text-xs text-[#9C2327]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gpsError}</span>
            </div>
          )}

          <form onSubmit={applyManualLocation} className="space-y-3 pt-2 border-t border-[#272757]/10">
            <p className="text-xs font-semibold text-[#0F0E47]">Or Select Your Oyo State Town</p>
            <div>
              <label htmlFor="manual-city" className="block text-xs text-[#505081] mb-1">
                Oyo State Town / Hub
              </label>
              <select
                id="manual-city"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 bg-white text-sm text-[#0F0E47]"
              >
                {Object.keys(NIGERIA_CITY_PRESETS).map((city) => (
                  <option key={city} value={city}>
                    {city} ({NIGERIA_CITY_PRESETS[city].state})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="manual-street" className="block text-xs text-[#505081] mb-1">
                Street or Neighbourhood (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#8686AC] absolute left-3.5 top-3.5" />
                <input
                  id="manual-street"
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="e.g. Awolowo Avenue, Bodija, Ibadan"
                  className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] rounded-xl border border-[#272757]/20 text-sm text-[#0F0E47]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2.5 min-h-[44px] rounded-xl bg-[#E8702A] hover:bg-[#CF5E1D] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Use Manual Address
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
