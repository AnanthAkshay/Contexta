import { NativeModules } from 'react-native';

/**
 * Mock Accelerometer Bridge — Movement Detection
 *
 * Simulates the data that will come from the Android native module
 * (MovementDetector.java) once the React Native bridge is wired up.
 *
 * Generates realistic-looking accelerometer variance data
 * to demonstrate the movement detection flow.
 */

export interface MovementData {
  /** Whether user is currently moving (variance > 0.8) */
  isMoving: boolean;
  /** Computed accelerometer variance over rolling 5s window */
  variance: number;
  /** Inferred transport mode: "walking" | "driving" | "stationary" */
  transportMode: 'walking' | 'driving' | 'stationary';
  /** Unix epoch seconds */
  timestamp: number;
}

// ── State ────────────────────────────────────────────────────

/** Simulated variance that slowly changes over time */
let simulatedVariance = 0.3;
let isSimulatingMovement = false;
let simulationInterval: ReturnType<typeof setInterval> | null = null;

// ── Public API ───────────────────────────────────────────────

/**
 * Reads the current accelerometer state.
 *
 * Tries to call the Android native module's MovementModule.getMovementData().
 * Falls back to simulation if unavailable or on error.
 */
export async function getAccelerometerReading(): Promise<MovementData> {
  try {
    const nativeModule = NativeModules.MovementModule;
    if (nativeModule && typeof nativeModule.getMovementData === 'function') {
      const result = await nativeModule.getMovementData();
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;

      if (
        parsed &&
        typeof parsed === 'object' &&
        'isMoving' in parsed &&
        'variance' in parsed &&
        'transportMode' in parsed
      ) {
        console.log('[MovementBridge] Using native accelerometer');
        return {
          ...parsed,
          timestamp: Math.floor(Date.now() / 1000),
        } as MovementData;
      }
    }
  } catch (error) {
    console.log('[MovementBridge] Falling back to mock', error);
  }

  console.log('[MovementBridge] Falling back to mock');
  // Simulate ~100ms sensor read latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Add some noise to make it feel dynamic
  const noise = (Math.random() - 0.5) * 0.4;
  const currentVariance = Math.max(0, simulatedVariance + noise);

  const isMoving = currentVariance > 0.8;
  const transportMode = classifyTransportMode(currentVariance);

  return {
    isMoving,
    variance: Math.round(currentVariance * 1000) / 1000,
    transportMode,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Starts continuous movement simulation.
 * Variance gradually increases to simulate the user starting to move.
 *
 * @param callback called every 500ms with new movement data
 * @returns cleanup function to stop simulation
 */
export function startMovementSimulation(
  callback: (data: MovementData) => void,
): () => void {
  isSimulatingMovement = true;
  simulatedVariance = 0.3; // Start stationary

  // Gradually increase variance to simulate movement starting
  let tick = 0;
  simulationInterval = setInterval(() => {
    tick++;

    // Phase 1: Stationary (0-5s)
    // Phase 2: Starting to move (5-10s)
    // Phase 3: Walking (10-20s)
    // Phase 4: Driving (20-30s)
    // Phase 5: Slowing down (30-40s)
    // Phase 6: Back to stationary (40s+)
    if (tick < 10) {
      simulatedVariance = 0.2 + Math.random() * 0.3;
    } else if (tick < 20) {
      simulatedVariance = 0.5 + (tick - 10) * 0.08 + Math.random() * 0.2;
    } else if (tick < 40) {
      simulatedVariance = 1.2 + Math.random() * 0.5;
    } else if (tick < 60) {
      simulatedVariance = 3.0 + Math.random() * 1.5;
    } else if (tick < 80) {
      simulatedVariance = Math.max(0.3, simulatedVariance - 0.1 + Math.random() * 0.1);
    } else {
      // Reset cycle
      tick = 0;
    }

    const noise = (Math.random() - 0.5) * 0.2;
    const currentVariance = Math.max(0, simulatedVariance + noise);
    const isMoving = currentVariance > 0.8;

    callback({
      isMoving,
      variance: Math.round(currentVariance * 1000) / 1000,
      transportMode: classifyTransportMode(currentVariance),
      timestamp: Math.floor(Date.now() / 1000),
    });
  }, 500);

  // Return cleanup function
  return () => {
    isSimulatingMovement = false;
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
  };
}

/**
 * Injects a "moving" state for demo purposes.
 * Returns high-variance data as if the user is walking.
 */
export function injectMovingState(): MovementData {
  return {
    isMoving: true,
    variance: 1.45,
    transportMode: 'walking',
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Injects a "driving" state for demo purposes.
 */
export function injectDrivingState(): MovementData {
  return {
    isMoving: true,
    variance: 3.82,
    transportMode: 'driving',
    timestamp: Math.floor(Date.now() / 1000),
  };
}

// ── Internal ─────────────────────────────────────────────────

function classifyTransportMode(variance: number): 'walking' | 'driving' | 'stationary' {
  if (variance > 3.0) return 'driving';
  if (variance > 0.8) return 'walking';
  return 'stationary';
}
