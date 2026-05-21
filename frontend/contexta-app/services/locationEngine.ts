/**
 * Contexta — services/locationEngine.ts
 * ─────────────────────────────────────────────────────────────
 * Real-time GPS contextual intelligence engine.
 * Web-safe: uses browser Geolocation API on web,
 * expo-location on native (Android/iOS).
 */

import { Platform } from 'react-native';

// ── Constants ──────────────────────────────────────────────────
const SPEED_STATIC   = 0.5;
const SPEED_WALKING  = 2.5;
const SPEED_CYCLING  = 8.0;
const STATIC_THRESHOLD_METERS = 3;
const HISTORY_SIZE = 5;

export type ActivityType = 'STATIC' | 'WALKING' | 'CYCLING' | 'DRIVING';

export interface LocationReading {
  latitude:  number;
  longitude: number;
  speed:     number;
  accuracy:  number;
  timestamp: number;
  heading:   number | null;
  altitude:  number | null;
}

export interface LiveContext {
  latitude:   number;
  longitude:  number;
  accuracy:   number;
  altitude:   number | null;
  activity:   ActivityType;
  isMoving:   boolean;
  speed:      number;
  speedKmh:   number;
  heading:    number | null;
  distanceM:  number;
  distanceKm: string;
  confidence: number;
  reason:     string;
  suggestions: Suggestion[];
  lastUpdated: string;
  sessionStart: number;
  readingCount: number;
  error:      string | null;
  permissionGranted: boolean;
}

export interface Suggestion {
  icon:     string;
  label:    string;
  category: string;
}

// ── Haversine Distance ─────────────────────────────────────────
export function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Activity Classifier ────────────────────────────────────────
export function classifyActivity(speedMs: number): ActivityType {
  if (speedMs < SPEED_STATIC)  return 'STATIC';
  if (speedMs < SPEED_WALKING) return 'WALKING';
  if (speedMs < SPEED_CYCLING) return 'CYCLING';
  return 'DRIVING';
}

// ── AI Reasoning ──────────────────────────────────────────────
export function generateReason(
  activity: ActivityType,
  speedMs: number,
  distanceM: number,
  readingCount: number,
  accuracy: number,
): string {
  const speedKmh = (speedMs * 3.6).toFixed(1);
  const dist = distanceM >= 1000
    ? `${(distanceM / 1000).toFixed(2)} km`
    : `${Math.round(distanceM)} m`;

  if (readingCount < 2) return 'Acquiring GPS signal — calibrating position...';

  switch (activity) {
    case 'STATIC':
      if (distanceM < 5) return 'No position change detected. Device is stationary.';
      return `Minimal movement (${dist}). User likely stationary or indoors.`;
    case 'WALKING':
      return `Walking pace inferred from GPS (${speedKmh} km/h). ${dist} covered this session.`;
    case 'CYCLING':
      return `Cycling speed detected (${speedKmh} km/h). GPS accuracy: ±${Math.round(accuracy)}m.`;
    case 'DRIVING':
      return `Driving speed inferred from GPS (${speedKmh} km/h). ${dist} covered this session.`;
  }
}

// ── Nearby Suggestions ────────────────────────────────────────
export function getSuggestions(activity: ActivityType): Suggestion[] {
  switch (activity) {
    case 'STATIC':
      return [
        { icon: '☕', label: 'Nearby Café',         category: 'Food & Drink' },
        { icon: '🏢', label: 'Coworking Space',      category: 'Work'        },
        { icon: '🛒', label: 'Supermarket',          category: 'Errands'     },
        { icon: '🤝', label: 'Meeting Room',         category: 'Work'        },
      ];
    case 'WALKING':
      return [
        { icon: '🛒', label: 'Supermarket',          category: 'Errands'     },
        { icon: '☕', label: 'Coffee Shop',           category: 'Food & Drink'},
        { icon: '🚌', label: 'Bus Stop',             category: 'Transit'     },
        { icon: '🏪', label: 'Convenience Store',    category: 'Errands'     },
      ];
    case 'CYCLING':
      return [
        { icon: '🔧', label: 'Bike Repair Shop',     category: 'Services'    },
        { icon: '🚰', label: 'Water Refill Point',   category: 'Health'      },
        { icon: '🛣️', label: 'Cycle Path Ahead',     category: 'Navigation'  },
        { icon: '🏪', label: 'Quick Stop Store',     category: 'Errands'     },
      ];
    case 'DRIVING':
      return [
        { icon: '⛽', label: 'Petrol Bunk',          category: 'Vehicle'     },
        { icon: '🔋', label: 'EV Charging Station',  category: 'Vehicle'     },
        { icon: '🅿️', label: 'Parking Nearby',       category: 'Vehicle'     },
        { icon: '🍔', label: 'Drive-through / Diner',category: 'Food & Drink'},
      ];
  }
}

// ── Speed smoother ─────────────────────────────────────────────
function smoothSpeed(history: LocationReading[]): number {
  if (history.length < 2) return 0;
  const speeds: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];
    const dt = (curr.timestamp - prev.timestamp) / 1000;
    if (dt <= 0) continue;
    if (curr.speed >= 0) {
      speeds.push(curr.speed);
    } else {
      const dist = haversineMeters(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      speeds.push(dist / dt);
    }
  }
  if (speeds.length === 0) return 0;
  return speeds.reduce((a, b) => a + b, 0) / speeds.length;
}

// ── Main Engine ────────────────────────────────────────────────
class LocationEngine {
  private watchId:      number | null = null;
  private history:      LocationReading[] = [];
  private distanceM:    number = 0;
  private sessionStart: number = Date.now();
  private readingCount: number = 0;
  private listeners:    Array<(ctx: LiveContext) => void> = [];
  private lastContext:  LiveContext | null = null;
  private permissionGranted: boolean = false;

  subscribe(cb: (ctx: LiveContext) => void): () => void {
    this.listeners.push(cb);
    if (this.lastContext) cb(this.lastContext);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }

  private emit(ctx: LiveContext) {
    this.lastContext = ctx;
    this.listeners.forEach(cb => cb(ctx));
  }

  async start(): Promise<void> {
    this.sessionStart = Date.now();

    // ── Native (Android/iOS): use expo-location ────────────
    if (Platform.OS !== 'web') {
      try {
        const Location = require('expo-location');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          this.emit(this.buildErrorContext('Location permission denied.', false));
          return;
        }
        this.permissionGranted = true;

        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          this.onLocation({
            latitude: pos.coords.latitude, longitude: pos.coords.longitude,
            speed: pos.coords.speed ?? -1, accuracy: pos.coords.accuracy ?? 999,
            timestamp: pos.timestamp, heading: pos.coords.heading ?? null,
            altitude: pos.coords.altitude ?? null,
          });
        } catch (_) {}

        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 2 },
          (pos: any) => this.onLocation({
            latitude: pos.coords.latitude, longitude: pos.coords.longitude,
            speed: pos.coords.speed ?? -1, accuracy: pos.coords.accuracy ?? 999,
            timestamp: pos.timestamp, heading: pos.coords.heading ?? null,
            altitude: pos.coords.altitude ?? null,
          }),
        );
        // Store remove fn
        (this as any)._nativeSub = sub;
      } catch (e) {
        this.emit(this.buildErrorContext('GPS unavailable on this device.', false));
      }
      return;
    }

    // ── Web: use browser Geolocation API ──────────────────
    if (!navigator?.geolocation) {
      this.emit(this.buildErrorContext('Geolocation not supported in this browser.', false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.permissionGranted = true;
        this.onLocation({
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
          speed: pos.coords.speed ?? -1, accuracy: pos.coords.accuracy ?? 999,
          timestamp: pos.timestamp, heading: pos.coords.heading ?? null,
          altitude: pos.coords.altitude ?? null,
        });
      },
      (err) => {
        this.emit(this.buildErrorContext(
          err.code === 1
            ? 'Location permission denied. Click the 🔒 icon in your browser address bar to allow.'
            : 'GPS signal unavailable.',
          false,
        ));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.permissionGranted = true;
        this.onLocation({
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
          speed: pos.coords.speed ?? -1, accuracy: pos.coords.accuracy ?? 999,
          timestamp: pos.timestamp, heading: pos.coords.heading ?? null,
          altitude: pos.coords.altitude ?? null,
        });
      },
      (_err) => {},
      { enableHighAccuracy: true, maximumAge: 3000 },
    );
  }

  stop() {
    if (Platform.OS !== 'web') {
      (this as any)._nativeSub?.remove();
    } else if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private onLocation(reading: LocationReading) {
    if (this.history.length > 0) {
      const prev = this.history[this.history.length - 1];
      const delta = haversineMeters(prev.latitude, prev.longitude, reading.latitude, reading.longitude);
      if (delta > STATIC_THRESHOLD_METERS) this.distanceM += delta;
    }

    this.history.push(reading);
    if (this.history.length > HISTORY_SIZE) this.history.shift();
    this.readingCount++;

    const speedMs  = smoothSpeed(this.history);
    const activity = classifyActivity(speedMs);

    const ctx: LiveContext = {
      latitude:  reading.latitude,
      longitude: reading.longitude,
      accuracy:  reading.accuracy,
      altitude:  reading.altitude,
      activity,
      isMoving:  activity !== 'STATIC',
      speed:     speedMs,
      speedKmh:  speedMs * 3.6,
      heading:   reading.heading,
      distanceM: this.distanceM,
      distanceKm: this.distanceM >= 1000
        ? `${(this.distanceM / 1000).toFixed(2)} km`
        : `${Math.round(this.distanceM)} m`,
      confidence:  this.computeConfidence(speedMs, reading.accuracy),
      reason:      generateReason(activity, speedMs, this.distanceM, this.readingCount, reading.accuracy),
      suggestions: getSuggestions(activity),
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sessionStart: this.sessionStart,
      readingCount: this.readingCount,
      error:        null,
      permissionGranted: true,
    };

    this.emit(ctx);
  }

  private computeConfidence(speedMs: number, accuracy: number): number {
    const accuracyScore = Math.max(0, 1 - accuracy / 50);
    const readingScore  = Math.min(1, this.readingCount / 5);
    return Math.round((accuracyScore * 0.5 + readingScore * 0.5) * 100) / 100;
  }

  private buildErrorContext(error: string, permissionGranted: boolean): LiveContext {
    return {
      latitude: 0, longitude: 0, accuracy: 0, altitude: null,
      activity: 'STATIC', isMoving: false,
      speed: 0, speedKmh: 0, heading: null,
      distanceM: 0, distanceKm: '0 m',
      confidence: 0,
      reason: error,
      suggestions: getSuggestions('STATIC'),
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sessionStart: this.sessionStart,
      readingCount: 0,
      error,
      permissionGranted,
    };
  }

  getLastContext(): LiveContext | null { return this.lastContext; }
}

export const locationEngine = new LocationEngine();
