/**
 * Contexta — services/movementDetector.ts
 * ─────────────────────────────────────────────────────────────
 * UPDATED: GPS-speed-aware movement classification.
 *
 * Original interface preserved 100% — only reasoning & ETAs
 * are now driven by real speed values when available.
 */

import type { AccelerometerData } from './movementBridge';

export interface MovementContextResult {
  context:       string;      // WALKING | COMMUTING | CYCLING | STATIONARY
  isMoving:      boolean;
  transportMode: string;
  variance:      number;
  suggestion:    string;
  eta:           string;
  reason:        string;
  confidence:    number;

  // GPS-extended fields (new, optional)
  speedKmh?:     number;
  distanceKm?:   string;
  activity?:     string;
}

export function determineMovementContext(data: AccelerometerData): MovementContextResult {
  const { isMoving, variance, transportMode } = data;

  // Use GPS-derived speed if available, else estimate from variance
  const speedKmh = data.speedKmh ?? estimateSpeedFromVariance(variance);
  const speedMs  = speedKmh / 3.6;
  const activity = data.activity ?? transportMode.toUpperCase();

  const distanceKm =
    data.distanceM !== undefined
      ? data.distanceM >= 1000
        ? `${(data.distanceM / 1000).toFixed(2)} km`
        : `${Math.round(data.distanceM)} m`
      : undefined;

  if (!isMoving) {
    const reason = data.reason ??
      (variance < 0.1
        ? 'No accelerometer variance. Device fully stationary.'
        : 'Low movement detected. User likely stationary or seated.');

    return {
      context:       'STATIONARY',
      isMoving:      false,
      transportMode: 'stationary',
      variance,
      suggestion:    'No action needed',
      eta:           'N/A',
      reason,
      confidence:    data.confidence ?? 0.85,
      speedKmh:      0,
      distanceKm,
      activity:      'STATIC',
    };
  }

  // ── Moving: classify by mode ──────────────────────────────
  switch (transportMode) {
    case 'driving': {
      const reason = data.reason ??
        `Driving speed inferred from GPS (${speedKmh.toFixed(1)} km/h). Navigation mode active.`;
      return {
        context:       'COMMUTING',
        isMoving:      true,
        transportMode: 'driving',
        variance,
        suggestion:    'Open Maps for navigation assistance',
        eta:           estimateEta(speedMs, 5000),  // rough 5km trip
        reason,
        confidence:    data.confidence ?? 0.93,
        speedKmh,
        distanceKm,
        activity:      'DRIVING',
      };
    }

    case 'cycling': {
      const reason = data.reason ??
        `Cycling speed detected (${speedKmh.toFixed(1)} km/h). Low-speed sustained movement.`;
      return {
        context:       'CYCLING',
        isMoving:      true,
        transportMode: 'cycling',
        variance,
        suggestion:    'Check for nearby bike lanes or repair shops',
        eta:           estimateEta(speedMs, 2000),
        reason,
        confidence:    data.confidence ?? 0.82,
        speedKmh,
        distanceKm,
        activity:      'CYCLING',
      };
    }

    case 'walking':
    default: {
      const reason = data.reason ??
        `Walking pace inferred (${speedKmh.toFixed(1)} km/h). Launch music for your walk.`;
      return {
        context:       'WALKING',
        isMoving:      true,
        transportMode: 'walking',
        variance,
        suggestion:    'Launch music for your walk',
        eta:           estimateEta(speedMs, 500),
        reason,
        confidence:    data.confidence ?? 0.88,
        speedKmh,
        distanceKm,
        activity:      'WALKING',
      };
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────
function estimateSpeedFromVariance(variance: number): number {
  if (variance > 3.0)  return 50;  // driving
  if (variance > 0.8)  return 5;   // walking
  return 0;
}

function estimateEta(speedMs: number, distanceM: number): string {
  if (speedMs <= 0) return 'N/A';
  const seconds = distanceM / speedMs;
  const mins    = Math.round(seconds / 60);
  if (mins < 1)   return '< 1 min';
  if (mins < 60)  return `~${mins} min`;
  return `~${Math.floor(mins / 60)}h ${mins % 60}m`;
}
