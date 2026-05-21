/**
 * Contexta — services/movementDetector.ts
 * ─────────────────────────────────────────────────────────────
 * UPDATED: TFLite MLP Neural Network Movement Classifier.
 *
 * Replaces hardcoded variance thresholds with a trained neural
 * network forward pass engine executing weights from Python model.
 */

import type { AccelerometerData } from './movementBridge';
const modelWeights = require('./model_weights.json');

export interface MovementContextResult {
  context:       string;      // WALKING | COMMUTING | CYCLING | STATIONARY
  isMoving:      boolean;
  transportMode: string;
  variance:      number;
  suggestion:    string;
  eta:           string;
  reason:        string;
  confidence:    number;

  // GPS-extended fields
  speedKmh?:     number;
  distanceKm?:   string;
  activity?:     string;
}

interface ModelWeights {
  mean: number[];
  std: number[];
  W1: number[][];
  b1: number[];
  W2: number[][];
  b2: number[];
}

const weights = modelWeights as ModelWeights;

/**
 * Computes the forward pass of our Multi-Layer Perceptron (Input: 2 -> Hidden: 8 -> Output: 4)
 */
function predictMLP(variance: number, speedKmh: number): { activityClass: number; confidence: number } {
  // 1. Feature Standardization (Z-score Scaling using trained dataset statistics)
  const varScaled = (variance - weights.mean[0]) / weights.std[0];
  const speedScaled = (speedKmh - weights.mean[1]) / weights.std[1];
  
  const x = [varScaled, speedScaled];
  
  // 2. Layer 1: Input to Hidden (ReLU)
  const z1 = new Array(8).fill(0);
  for (let j = 0; j < 8; j++) {
    let sum = weights.b1[j];
    for (let i = 0; i < 2; i++) {
      sum += x[i] * weights.W1[i][j];
    }
    z1[j] = sum;
  }
  const h1 = z1.map(val => Math.max(0, val)); // ReLU Activation
  
  // 3. Layer 2: Hidden to Output (Logits)
  const z2 = new Array(4).fill(0);
  for (let k = 0; k < 4; k++) {
    let sum = weights.b2[k];
    for (let j = 0; j < 8; j++) {
      sum += h1[j] * weights.W2[j][k];
    }
    z2[k] = sum;
  }
  
  // 4. Softmax Probability Normalization
  const maxZ2 = Math.max(...z2);
  const expZ2 = z2.map(val => Math.exp(val - maxZ2)); // stability shift
  const sumExp = expZ2.reduce((a, b) => a + b, 0);
  const probs = expZ2.map(val => val / sumExp);
  
  // Find Class Argmax and Confidence Probability
  let bestClass = 0;
  let maxProb = 0;
  for (let k = 0; k < 4; k++) {
    if (probs[k] > maxProb) {
      maxProb = probs[k];
      bestClass = k;
    }
  }
  
  return {
    activityClass: bestClass,
    confidence: maxProb,
  };
}

export function determineMovementContext(data: AccelerometerData): MovementContextResult {
  const { variance } = data;

  // Resolve speed (use GPS speed if available, else estimate from variance)
  const speedKmh = data.speedKmh ?? estimateSpeedFromVariance(variance);
  const speedMs  = speedKmh / 3.6;

  // Run TFLite-trained MLP Neural Network Classifier
  const { activityClass, confidence } = predictMLP(variance, speedKmh);

  const distanceKm =
    data.distanceM !== undefined
      ? data.distanceM >= 1000
        ? `${(data.distanceM / 1000).toFixed(2)} km`
        : `${Math.round(data.distanceM)} m`
      : undefined;

  // Map neural network class output
  // Classes: 0: STATIONARY, 1: WALKING, 2: CYCLING, 3: COMMUTING (DRIVING)
  console.log(`[MLP Neural Net] Inputs: var=${variance.toFixed(2)}, speed=${speedKmh.toFixed(1)} km/h | Predicted: ${activityClass} (${(confidence * 100).toFixed(1)}% conf)`);

  switch (activityClass) {
    case 1: { // WALKING
      const reason = data.reason ??
        `Walking pace classified by TFLite MLP (${speedKmh.toFixed(1)} km/h, ${(confidence * 100).toFixed(0)}% conf). Launching music.`;
      return {
        context:       'WALKING',
        isMoving:      true,
        transportMode: 'walking',
        variance,
        suggestion:    'Launch music for your walk',
        eta:           estimateEta(speedMs, 500),
        reason,
        confidence,
        speedKmh,
        distanceKm,
        activity:      'WALKING',
      };
    }

    case 2: { // CYCLING
      const reason = data.reason ??
        `Cycling pace classified by TFLite MLP (${speedKmh.toFixed(1)} km/h, ${(confidence * 100).toFixed(0)}% conf). Safe routes active.`;
      return {
        context:       'CYCLING',
        isMoving:      true,
        transportMode: 'cycling',
        variance,
        suggestion:    'Check for nearby bike lanes or repair shops',
        eta:           estimateEta(speedMs, 2000),
        reason,
        confidence,
        speedKmh,
        distanceKm,
        activity:      'CYCLING',
      };
    }

    case 3: { // COMMUTING (DRIVING)
      const reason = data.reason ??
        `Driving speed classified by TFLite MLP (${speedKmh.toFixed(1)} km/h, ${(confidence * 100).toFixed(0)}% conf). Navigation active.`;
      return {
        context:       'COMMUTING',
        isMoving:      true,
        transportMode: 'driving',
        variance,
        suggestion:    'Open Maps for navigation assistance',
        eta:           estimateEta(speedMs, 5000),
        reason,
        confidence,
        speedKmh,
        distanceKm,
        activity:      'DRIVING',
      };
    }

    case 0: // STATIONARY
    default: {
      const reason = data.reason ??
        `Device classified as Stationary by TFLite MLP (accel variance ${variance.toFixed(3)}, ${(confidence * 100).toFixed(0)}% conf).`;
      return {
        context:       'STATIONARY',
        isMoving:      false,
        transportMode: 'stationary',
        variance,
        suggestion:    'No action needed',
        eta:           'N/A',
        reason,
        confidence,
        speedKmh:      0,
        distanceKm,
        activity:      'STATIC',
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

