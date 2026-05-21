/**
 * Contexta — services/movementBridge.ts
 * ─────────────────────────────────────────────────────────────
 * UPDATED: Now backed by real GPS via locationEngine.
 *
 * Keeps the same interface as the original so index.tsx
 * and movementDetector.ts don't break.
 *
 * Original accelerometer approach is preserved as fallback
 * when GPS is unavailable (NativeModules.MovementModule).
 */

import { NativeModules } from 'react-native';
import { locationEngine, type LiveContext } from './locationEngine';

export interface AccelerometerData {
  isMoving:      boolean;
  variance:      number;
  transportMode: string;
  // GPS extensions (new fields — optional so old code still compiles)
  speedMs?:      number;
  speedKmh?:     number;
  distanceM?:    number;
  activity?:     string;
  latitude?:     number;
  longitude?:    number;
  accuracy?:     number;
  reason?:       string;
  confidence?:   number;
}

// ── Read from GPS (primary) with accelerometer fallback ────────
export async function getAccelerometerReading(): Promise<AccelerometerData> {
  // Prefer live GPS context if engine has a recent fix (< 10s old)
  const ctx = locationEngine.getLastContext();
  if (ctx && ctx.permissionGranted && ctx.readingCount > 0) {
    return gpsContextToAccData(ctx);
  }

  // Fallback: native accelerometer module (original behaviour)
  try {
    const { MovementModule } = NativeModules;
    if (MovementModule?.getMovementData) {
      const raw: string = await MovementModule.getMovementData();
      return JSON.parse(raw);
    }
  } catch (_) {}

  // Last resort: neutral static reading
  return { isMoving: false, variance: 0, transportMode: 'stationary' };
}

// ── Convert LiveContext → AccelerometerData shape ──────────────
function gpsContextToAccData(ctx: LiveContext): AccelerometerData {
  // Map activity to transportMode string for backwards compat
  const modeMap: Record<string, string> = {
    STATIC:  'stationary',
    WALKING: 'walking',
    CYCLING: 'cycling',
    DRIVING: 'driving',
  };

  // Synthetic variance: approximated from speed for legacy consumers
  const syntheticVariance =
    ctx.activity === 'DRIVING'  ? 4.5 :
    ctx.activity === 'CYCLING'  ? 2.0 :
    ctx.activity === 'WALKING'  ? 1.2 :
    0.1;

  return {
    isMoving:      ctx.isMoving,
    variance:      syntheticVariance,
    transportMode: modeMap[ctx.activity] ?? 'stationary',
    speedMs:       ctx.speed,
    speedKmh:      ctx.speedKmh,
    distanceM:     ctx.distanceM,
    activity:      ctx.activity,
    latitude:      ctx.latitude,
    longitude:     ctx.longitude,
    accuracy:      ctx.accuracy,
    reason:        ctx.reason,
    confidence:    ctx.confidence,
  };
}

// ── Demo injection helpers (preserved from original) ──────────
export function injectMovingState(): AccelerometerData {
  return {
    isMoving:      true,
    variance:      1.4,
    transportMode: 'walking',
    speedMs:       1.4,
    speedKmh:      5.0,
    distanceM:     120,
    activity:      'WALKING',
    reason:        'Demo: walking pace injected',
    confidence:    0.88,
  };
}

export function injectDrivingState(): AccelerometerData {
  return {
    isMoving:      true,
    variance:      4.8,
    transportMode: 'driving',
    speedMs:       13.9,
    speedKmh:      50.0,
    distanceM:     2800,
    activity:      'DRIVING',
    reason:        'Demo: driving speed injected',
    confidence:    0.93,
  };
}

export function injectCyclingState(): AccelerometerData {
  return {
    isMoving:      true,
    variance:      2.2,
    transportMode: 'cycling',
    speedMs:       5.5,
    speedKmh:      20.0,
    distanceM:     800,
    activity:      'CYCLING',
    reason:        'Demo: cycling speed injected',
    confidence:    0.85,
  };
}
