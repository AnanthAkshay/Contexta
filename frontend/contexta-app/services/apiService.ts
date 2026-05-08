import { ContextResult } from './contextDetector';
import { MovementContextResult } from './movementDetector';
import { HomeData } from './homeBridge';

const BASE_URL = 'http://10.0.2.2:8080';
// For real device testing: change to http://192.168.x.x:8080

/**
 * Syncs meeting detection results to the backend.
 */
export async function syncMeetingContext(contextResult: ContextResult): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: contextResult.context,
        confidence: contextResult.confidence,
        action: contextResult.action,
        eventTitle: contextResult.eventTitle,
        source: contextResult.source,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      console.log('[API] Synced meeting context to backend');
    }
  } catch (err: any) {
    console.log('[API] Backend sync failed (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Syncs movement detection data to the backend.
 */
export async function syncMovementData(movementResult: MovementContextResult): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/movement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isMoving: movementResult.isMoving,
        variance: movementResult.variance,
        transportMode: movementResult.transportMode,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      console.log('[API] Synced movement data to backend');
    }
  } catch (err: any) {
    console.log('[API] Backend sync failed (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Syncs home detection data to the backend.
 */
export async function syncHomeDetection(homeData: HomeData): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/home/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentSSID: homeData.currentSSID,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      console.log('[API] Synced home detection to backend');
    }
  } catch (err: any) {
    console.log('[API] Backend sync failed (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}
