/**
 * Movement Context Detection Logic
 *
 * Takes accelerometer data from the movement bridge and produces
 * a structured context result for the UI.
 *
 * Rules:
 *   variance > 3.0   →  DRIVING, confidence 0.85
 *   variance > 0.8   →  WALKING, confidence 0.87
 *   otherwise        →  STATIONARY, confidence 0.92
 */

import type { MovementData } from './movementBridge';

// ── Types ────────────────────────────────────────────────────

export type MovementContextType = 'COMMUTING' | 'WALKING' | 'STATIONARY';

export interface MovementContextResult {
  /** Detected movement context */
  context: MovementContextType;
  /** Whether user is actively moving */
  isMoving: boolean;
  /** Accelerometer variance */
  variance: number;
  /** Transport mode label */
  transportMode: string;
  /** Confidence score (0.0 – 1.0) */
  confidence: number;
  /** Human-readable reason */
  reason: string;
  /** Suggested action description */
  suggestion: string;
  /** Fake ETA string */
  eta: string;
  /** Timestamp string */
  detectedAt: string;
}

// ── Core detection function ──────────────────────────────────

/**
 * Determines movement context from accelerometer data.
 */
export function determineMovementContext(
  data: MovementData,
): MovementContextResult {
  let context: MovementContextType;
  let confidence: number;
  let reason: string;
  let suggestion: string;
  let eta: string;

  if (data.transportMode === 'driving') {
    context = 'COMMUTING';
    confidence = 0.85;
    reason = `High variance (${data.variance.toFixed(2)}) — driving detected`;
    suggestion = 'Open Maps for navigation';
    eta = '~15 min by car';
  } else if (data.transportMode === 'walking') {
    context = 'WALKING';
    confidence = 0.87;
    reason = `Moderate variance (${data.variance.toFixed(2)}) — walking detected`;
    suggestion = 'Launch music for your walk';
    eta = '~25 min on foot';
  } else {
    context = 'STATIONARY';
    confidence = 0.92;
    reason = `Low variance (${data.variance.toFixed(2)}) — no movement`;
    suggestion = 'No action needed';
    eta = 'N/A';
  }

  const result: MovementContextResult = {
    context,
    isMoving: data.isMoving,
    variance: data.variance,
    transportMode: data.transportMode,
    confidence,
    reason,
    suggestion,
    eta,
    detectedAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  // Debug logging
  console.log('┌─── Movement Detection ──────────────────');
  console.log(`│ Variance     : ${data.variance.toFixed(3)}`);
  console.log(`│ Is Moving    : ${data.isMoving}`);
  console.log(`│ Transport    : ${data.transportMode}`);
  console.log(`│ → Context    : ${result.context}`);
  console.log(`│ → Confidence : ${result.confidence}`);
  console.log(`│ → Suggestion : ${result.suggestion}`);
  console.log(`│ → ETA        : ${result.eta}`);
  console.log('└──────────────────────────────────────────');

  return result;
}
