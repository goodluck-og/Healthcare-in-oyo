import type {
  Coordinates,
  Facility,
  WearableReading,
  WearableThresholds,
} from '../types/healthcare';

export const DEFAULT_WEARABLE_THRESHOLDS: WearableThresholds = {
  minHeartRateBpm: 42,
  maxHeartRateBpm: 155,
  minSpo2Percent: 90,
  maxSystolicMmHg: 180,
  maxDiastolicMmHg: 120,
  maxTemperatureC: 39.8,
};

export interface VitalSafetyAssessment {
  severity: 'normal' | 'warning' | 'critical';
  reasons: string[];
  recommendedAction: string;
}

/**
 * Evaluates smartwatch/wearable vitals against configurable clinical alert thresholds.
 * Always pairs status with explicit plain-language reasons (never color-only).
 */
export function evaluateWearableVitals(
  reading: Pick<
    WearableReading,
    'heartRateBpm' | 'spo2Percent' | 'systolic' | 'diastolic' | 'temperatureC'
  >,
  thresholds: WearableThresholds = DEFAULT_WEARABLE_THRESHOLDS
): VitalSafetyAssessment {
  const criticalReasons: string[] = [];
  const warningReasons: string[] = [];

  if (reading.heartRateBpm > 0) {
    if (reading.heartRateBpm <= thresholds.minHeartRateBpm) {
      criticalReasons.push(`Critically low heart rate (${reading.heartRateBpm} bpm)`);
    } else if (reading.heartRateBpm >= thresholds.maxHeartRateBpm) {
      criticalReasons.push(`Critically high heart rate (${reading.heartRateBpm} bpm)`);
    } else if (reading.heartRateBpm < 52 || reading.heartRateBpm > 115) {
      warningReasons.push(`Heart rate outside typical resting range (${reading.heartRateBpm} bpm)`);
    }
  }

  if (reading.spo2Percent > 0) {
    if (reading.spo2Percent < thresholds.minSpo2Percent) {
      criticalReasons.push(`Critically low oxygen saturation (SpO₂ ${reading.spo2Percent}%)`);
    } else if (reading.spo2Percent < 94) {
      warningReasons.push(`Borderline oxygen saturation (SpO₂ ${reading.spo2Percent}%)`);
    }
  }

  if (reading.systolic && reading.diastolic) {
    if (
      reading.systolic >= thresholds.maxSystolicMmHg ||
      reading.diastolic >= thresholds.maxDiastolicMmHg
    ) {
      criticalReasons.push(
        `Hypertensive crisis range BP (${reading.systolic}/${reading.diastolic} mmHg)`
      );
    } else if (reading.systolic < 80 || reading.diastolic < 50) {
      criticalReasons.push(
        `Critically low blood pressure (${reading.systolic}/${reading.diastolic} mmHg)`
      );
    } else if (reading.systolic >= 140 || reading.diastolic >= 90) {
      warningReasons.push(`Elevated blood pressure (${reading.systolic}/${reading.diastolic} mmHg)`);
    }
  }

  if (reading.temperatureC) {
    if (reading.temperatureC >= thresholds.maxTemperatureC) {
      criticalReasons.push(`Dangerously high temperature (${reading.temperatureC.toFixed(1)}°C)`);
    } else if (reading.temperatureC <= 35.0) {
      criticalReasons.push(`Hypothermia warning (${reading.temperatureC.toFixed(1)}°C)`);
    } else if (reading.temperatureC >= 38.0) {
      warningReasons.push(`Fever detected (${reading.temperatureC.toFixed(1)}°C)`);
    }
  }

  if (criticalReasons.length > 0) {
    return {
      severity: 'critical',
      reasons: criticalReasons,
      recommendedAction:
        'Critical vital threshold crossed. Verify how you feel immediately — automatic emergency escalation to the nearest hospital and emergency line is active.',
    };
  }

  if (warningReasons.length > 0) {
    return {
      severity: 'warning',
      reasons: warningReasons,
      recommendedAction:
        'Rest quietly for 5 minutes and re-check with a validated medical device. Consult a clinician if readings stay elevated or you feel unwell.',
    };
  }

  return {
    severity: 'normal',
    reasons: ['All tracked vitals are within configured resting safety bounds.'],
    recommendedAction: 'Continue regular hydration, movement, and scheduled check-ins.',
  };
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface RankedEmergencyHospital {
  facility: Facility;
  distanceKm: number | null;
  mapsDirectionsUrl: string;
}

export function findNearestEmergencyHospitals(
  facilities: Facility[],
  coordinates: Coordinates | null
): RankedEmergencyHospital[] {
  return facilities
    .filter((f) => f.emergency24h)
    .map((facility) => {
      const distanceKm = coordinates
        ? haversineDistanceKm(
            coordinates.lat,
            coordinates.lng,
            facility.coordinates.lat,
            facility.coordinates.lng
          )
        : null;
      const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.coordinates.lat},${facility.coordinates.lng}`;
      return { facility, distanceKm, mapsDirectionsUrl };
    })
    .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
}

export function requestBrowserGpsLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('GPS geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
      },
      (err) => {
        reject(new Error(err.message || 'Location permission was declined.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  });
}

export interface SmartwatchSimulatorPreset {
  id: string;
  label: string;
  description: string;
  heartRateBpm: number;
  spo2Percent: number;
  systolic: number;
  diastolic: number;
  temperatureC: number;
  steps: number;
  sleepHours: number;
}

export const SMARTWATCH_SIMULATOR_PRESETS: SmartwatchSimulatorPreset[] = [
  {
    id: 'resting-normal',
    label: 'Resting Normal',
    description: 'Healthy baseline vitals from companion watch',
    heartRateBpm: 72,
    spo2Percent: 98,
    systolic: 118,
    diastolic: 76,
    temperatureC: 36.7,
    steps: 6420,
    sleepHours: 7.4,
  },
  {
    id: 'elevated-fever',
    label: 'Elevated / Fever Watch',
    description: 'Warning zone — fever & elevated resting pulse',
    heartRateBpm: 118,
    spo2Percent: 95,
    systolic: 142,
    diastolic: 91,
    temperatureC: 38.6,
    steps: 2150,
    sleepHours: 5.5,
  },
  {
    id: 'critical-low-spo2',
    label: 'Critical Low SpO₂ (Auto-SOS Test)',
    description: 'Triggers 15s Emergency Countdown + GPS Hospital Alert',
    heartRateBpm: 164,
    spo2Percent: 86,
    systolic: 148,
    diastolic: 94,
    temperatureC: 37.8,
    steps: 410,
    sleepHours: 5.0,
  },
  {
    id: 'critical-bradycardia',
    label: 'Critical Low Pulse / Collapse Test',
    description: 'Simulates severe bradycardia (<42 bpm) emergency trigger',
    heartRateBpm: 38,
    spo2Percent: 89,
    systolic: 76,
    diastolic: 46,
    temperatureC: 35.8,
    steps: 310,
    sleepHours: 6.1,
  },
];

interface BluetoothHeartRateConnection {
  deviceName: string;
  disconnect: () => void;
}

/**
 * Connects to a real standard Bluetooth GATT Heart Rate smartwatch/band (Service 0x180D)
 * when the browser supports Web Bluetooth.
 */
export async function connectWebBluetoothHeartRate(
  onHeartRate: (bpm: number, deviceName: string) => void,
  onDisconnect?: () => void
): Promise<BluetoothHeartRateConnection> {
  const nav = navigator as Navigator & {
    bluetooth?: {
      requestDevice: (opts: {
        filters: Array<{ services: Array<number | string> }>;
      }) => Promise<{
        name?: string;
        gatt?: {
          connect: () => Promise<{
            getPrimaryService: (service: number | string) => Promise<{
              getCharacteristic: (char: number | string) => Promise<{
                startNotifications: () => Promise<void>;
                addEventListener: (
                  event: string,
                  cb: (ev: { target?: { value?: DataView } }) => void
                ) => void;
              }>;
            }>;
            disconnect: () => void;
          }>;
        };
        addEventListener: (event: string, cb: () => void) => void;
      }>;
    };
  };

  if (!nav.bluetooth) {
    throw new Error(
      'Web Bluetooth is not available in this browser (use Chrome/Edge on Android, macOS, or Windows, or use the Smartwatch Simulator / Manual Entry).'
    );
  }

  const device = await nav.bluetooth.requestDevice({
    filters: [{ services: ['heart_rate'] }],
  });
  const deviceName = device.name || 'Bluetooth Heart-Rate Watch';
  const server = await device.gatt?.connect();
  if (!server) {
    throw new Error('Unable to open GATT connection to the wearable device.');
  }

  const service = await server.getPrimaryService('heart_rate');
  const characteristic = await service.getCharacteristic('heart_rate_measurement');
  await characteristic.startNotifications();

  characteristic.addEventListener('characteristicvaluechanged', (event) => {
    const value = event.target?.value;
    if (!value) return;
    const flags = value.getUint8(0);
    const is16Bit = (flags & 0x01) !== 0;
    const bpm = is16Bit ? value.getUint16(1, true) : value.getUint8(1);
    if (bpm >= 25 && bpm <= 240) {
      onHeartRate(bpm, deviceName);
    }
  });

  if (onDisconnect) {
    device.addEventListener('gattserverdisconnected', onDisconnect);
  }

  return {
    deviceName,
    disconnect: () => {
      try {
        server.disconnect();
      } catch {
        // Ignore already disconnected state
      }
    },
  };
}
