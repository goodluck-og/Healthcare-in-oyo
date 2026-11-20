import type { Coordinates, IntegrationStatus } from '../types/healthcare';

export function computeDistanceKm(a: Coordinates, b: Coordinates): number {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildGoogleMapsDirectionsUrl(
  destination: Coordinates,
  origin?: Coordinates | null
): string {
  const dest = `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;
  if (origin) {
    const orig = `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(dest)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`;
}

export function getMapsReadinessSummary(status: IntegrationStatus): {
  mode: 'live-ready' | 'unconfigured-preparation';
  label: string;
  detail: string;
} {
  const hasClientKey = Boolean(
    status.googleMapsConfigured ||
      (typeof import.meta !== 'undefined' &&
        (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_MAPS_API_KEY)
  );

  if (hasClientKey) {
    return {
      mode: 'live-ready',
      label: 'Google Maps Key Detected',
      detail:
        'VITE_GOOGLE_MAPS_API_KEY is present. Coordinate routing and external Google Maps handoff are active.',
    };
  }

  return {
    mode: 'unconfigured-preparation',
    label: 'Maps Preparation Mode (API Key Not Configured)',
    detail:
      'Straight-line Haversine distances and coordinate previews run locally. Add VITE_GOOGLE_MAPS_API_KEY when enabling interactive embedded Google Maps tiles.',
  };
}
