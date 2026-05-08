/**
 * Home Context Detection Logic
 *
 * Takes WiFi data from the home bridge and produces a structured
 * context result for the UI, including profile settings.
 *
 * Rules:
 *   SSID matches home  →  HOME mode, confidence 0.95
 *   SSID doesn't match →  AWAY mode, confidence 0.90
 */

import type { HomeData, HomeProfile } from './homeBridge';
import { getHomeProfile } from './homeBridge';

// ── Types ────────────────────────────────────────────────────

export type HomeContextType = 'HOME' | 'AWAY';

export interface HomeContextResult {
  /** Detected home context */
  context: HomeContextType;
  /** Whether user is at home */
  isHome: boolean;
  /** Current WiFi SSID */
  currentSSID: string;
  /** Stored home WiFi SSID */
  homeSSID: string;
  /** Confidence score (0.0 – 1.0) */
  confidence: number;
  /** Human-readable reason */
  reason: string;
  /** Profile settings to apply */
  profile: HomeProfile;
  /** Timestamp string */
  detectedAt: string;
}

// ── Core detection function ──────────────────────────────────

import { syncHomeDetection } from './apiService';

/**
 * Determines home context from WiFi data.
 */
export function determineHomeContext(data: HomeData): HomeContextResult {
  const isHome = data.isHome;
  const context: HomeContextType = isHome ? 'HOME' : 'AWAY';
  const confidence = isHome ? 0.95 : 0.90;
  const profile = getHomeProfile(isHome);

  const reason = isHome
    ? `WiFi SSID "${data.currentSSID}" matches home network`
    : `WiFi SSID "${data.currentSSID}" ≠ home network "${data.homeSSID}"`;

  const result: HomeContextResult = {
    context,
    isHome,
    currentSSID: data.currentSSID,
    homeSSID: data.homeSSID,
    confidence,
    reason,
    profile,
    detectedAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  // Debug logging
  console.log('┌─── Home Detection ──────────────────────');
  console.log(`│ Current SSID : ${data.currentSSID}`);
  console.log(`│ Home SSID    : ${data.homeSSID}`);
  console.log(`│ Is Home      : ${isHome}`);
  console.log(`│ → Context    : ${result.context}`);
  console.log(`│ → Confidence : ${result.confidence}`);
  console.log(`│ → Profile    : ${result.profile.mode}`);
  console.log(`│ → Wallpaper  : ${result.profile.wallpaperHint}`);
  console.log(`│ → Volume     : ${result.profile.volumeLevel}`);
  console.log(`│ → Notif.     : ${result.profile.notificationGrouping}`);
  console.log('└──────────────────────────────────────────');

  syncHomeDetection(data).catch(() => {});

  return result;
}
