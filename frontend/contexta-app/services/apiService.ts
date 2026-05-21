import { ContextResult } from './contextDetector';
import { MovementContextResult } from './movementDetector';
import { HomeData } from './homeBridge';

import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'web' ? 'http://localhost:8085' : 'http://10.0.2.2:8085';

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

export interface BackendMovementResult {
  isMoving: boolean;
  variance: number;
  transportMode: string;
  suggestion: string;
  etaEstimate: string;
  confidence: number;
}

/**
 * Syncs movement detection data to the backend.
 */
export async function syncMovementData(
  movementResult: MovementContextResult
): Promise<BackendMovementResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/movement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isMoving:      movementResult.isMoving,
        variance:      movementResult.variance,
        transportMode: movementResult.transportMode,
        deviceId:      'ExpoDevice',
        timestamp:     Math.floor(Date.now() / 1000),
        confidence:    movementResult.confidence,
        speedKmh:      movementResult.speedKmh ?? null,
        eta:           movementResult.eta ?? null,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[API] Synced movement data to backend successfully');
      return data;
    }
  } catch (err: any) {
    console.log('[API] Backend movement sync failed (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}

export interface BackendHomeResult {
  isHome: boolean;
  profileMode: 'HOME' | 'OFFICE' | 'AWAY';
  currentSSID: string;
  homeSSID: string;
  wallpaperHint: string;
  volumeLevel: string;
  notificationGrouping: string;
  confidence: number;
  reason: string;
}

/**
 * Syncs home detection data to the backend and returns the backend-computed consensus.
 */
export async function syncHomeDetection(homeData: HomeData): Promise<BackendHomeResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/home/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentSSID: homeData.currentSSID,
        deviceId: 'ExpoDevice',
        timestamp: Math.floor(Date.now() / 1000),
        latitude: homeData.latitude ?? null,
        longitude: homeData.longitude ?? null,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      const data: BackendHomeResult = await response.json();
      console.log('[API] Synced home detection to backend, received consensus');
      return data;
    }
  } catch (err: any) {
    console.log('[API] Backend sync failed (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
  return null;
}

/**
 * Synchronizes new home baseline settings with the Spring Boot backend.
 */
export async function syncHomeSettings(ssid: string, latitude: number, longitude: number): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/home/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ssid,
        latitude,
        longitude,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      console.log('[API] Synchronized new home baseline settings with Spring Boot backend');
    }
  } catch (err: any) {
    console.log('[API] Failed to sync home settings with backend (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Synchronizes new office baseline settings with the Spring Boot backend.
 */
export async function syncOfficeSettings(ssid: string, latitude: number, longitude: number): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/home/set-office`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ssid,
        latitude,
        longitude,
      }),
      signal: controller.signal,
    });

    if (response.ok) {
      console.log('[API] Synchronized new office baseline settings with Spring Boot backend');
    }
  } catch (err: any) {
    console.log('[API] Failed to sync office settings with backend (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface LogEntry {
  id: number;
  time: string;
  context: string;
  action: string;
  isOverride: boolean;
  source: string;
}

/**
 * Fetches historical action logs from the Spring Boot backend.
 */
export async function fetchActionLogs(): Promise<LogEntry[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/action-log`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[API] Fetched ${data.length} action logs from backend`);
      return data;
    }
  } catch (err: any) {
    console.log('[API] Failed to fetch action logs (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
  return [];
}

/**
 * Syncs a new action log to the Spring Boot backend.
 */
export async function syncActionLog(log: LogEntry): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${BASE_URL}/action-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
      signal: controller.signal,
    });

    if (response.ok) {
      console.log(`[API] Synced action log item ${log.id} to backend`);
    }
  } catch (err: any) {
    console.log('[API] Failed to sync action log item (offline?)', err.message);
  } finally {
    clearTimeout(timeoutId);
  }
}

