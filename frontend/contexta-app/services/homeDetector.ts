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
import { haversineMeters } from './locationEngine';
import { syncHomeDetection } from './apiService';

// ── Types ────────────────────────────────────────────────────

export type HomeContextType = 'HOME' | 'OFFICE' | 'AWAY';

export interface HomeContextResult {
  /** Detected home/office context */
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

/**
 * Determines home context from WiFi and GPS data.
 */
export function determineHomeContext(data: HomeData): HomeContextResult {
  const wifiMatchesHome = data.currentSSID === data.homeSSID;
  const wifiMatchesOffice = data.currentSSID === (data.officeSSID ?? 'OfficeWiFi_5G');

  let isHome = wifiMatchesHome;
  let isOffice = wifiMatchesOffice;
  let confidence = 0.90;
  let reason = '';
  let distanceHomeM: number | undefined;
  let distanceOfficeM: number | undefined;

  const homeLat = data.homeLatitude ?? 37.7749;
  const homeLon = data.homeLongitude ?? -122.4194;
  const officeLat = data.officeLatitude ?? 37.7894;
  const officeLon = data.officeLongitude ?? -122.4014;

  if (
    data.latitude !== undefined && data.latitude !== null &&
    data.longitude !== undefined && data.longitude !== null
  ) {
    // GPS coordinates available: calculate distances
    distanceHomeM = haversineMeters(data.latitude, data.longitude, homeLat, homeLon);
    distanceOfficeM = haversineMeters(data.latitude, data.longitude, officeLat, officeLon);

    const gpsMatchesHome = distanceHomeM <= 50;
    const gpsMatchesOffice = distanceOfficeM <= 50;

    if (wifiMatchesHome || gpsMatchesHome) {
      isHome = true;
      isOffice = false;
      if (wifiMatchesHome && gpsMatchesHome) {
        confidence = 1.00;
        reason = `SSID matches "${data.currentSSID}" AND GPS is within ${distanceHomeM.toFixed(0)}m of home (Strong Dual-Signal Match)`;
      } else if (wifiMatchesHome) {
        confidence = 0.80;
        reason = `Connected to SSID "${data.currentSSID}", but GPS is ${distanceHomeM.toFixed(0)}m away from home (Potential WiFi drift/SSID sharing)`;
      } else {
        confidence = 0.85;
        reason = `GPS is within ${distanceHomeM.toFixed(0)}m of home, though connected to SSID "${data.currentSSID}"`;
      }
    } else if (wifiMatchesOffice || gpsMatchesOffice) {
      isHome = false;
      isOffice = true;
      if (wifiMatchesOffice && gpsMatchesOffice) {
        confidence = 1.00;
        reason = `SSID matches "${data.currentSSID}" AND GPS is within ${distanceOfficeM.toFixed(0)}m of office (Strong Dual-Signal Work Match)`;
      } else if (wifiMatchesOffice) {
        confidence = 0.80;
        reason = `Connected to SSID "${data.currentSSID}", but GPS is ${distanceOfficeM.toFixed(0)}m away from office (Potential WiFi drift/SSID sharing)`;
      } else {
        confidence = 0.85;
        reason = `GPS is within ${distanceOfficeM.toFixed(0)}m of office, though connected to SSID "${data.currentSSID}"`;
      }
    } else {
      isHome = false;
      isOffice = false;
      confidence = 0.95;
      reason = `SSID "${data.currentSSID}" ≠ home/office AND GPS is far away from home (${distanceHomeM.toFixed(0)}m) and office (${distanceOfficeM.toFixed(0)}m)`;
    }
  } else {
    // GPS missing, fall back to WiFi SSID only
    if (wifiMatchesHome) {
      isHome = true;
      isOffice = false;
      confidence = 0.90;
      reason = `WiFi SSID "${data.currentSSID}" matches home network (GPS lock unavailable)`;
    } else if (wifiMatchesOffice) {
      isHome = false;
      isOffice = true;
      confidence = 0.90;
      reason = `WiFi SSID "${data.currentSSID}" matches office network (GPS lock unavailable)`;
    } else {
      isHome = false;
      isOffice = false;
      confidence = 0.85;
      reason = `WiFi SSID "${data.currentSSID}" ≠ home/office network "${data.homeSSID}" (GPS lock unavailable)`;
    }
  }

  const context: HomeContextType = isHome ? 'HOME' : (isOffice ? 'OFFICE' : 'AWAY');
  const profile = getHomeProfile(context);

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
      second: '2-digit',
      hour12: true,
    }),
  };

  // Debug logging
  console.log('┌─── Dual-Signal Home Detection ──────────');
  console.log(`│ Current SSID : ${data.currentSSID}`);
  console.log(`│ Home SSID    : ${data.homeSSID}`);
  console.log(`│ GPS Position : ${data.latitude !== undefined && data.latitude !== null ? `${data.latitude.toFixed(6)}, ${data.longitude?.toFixed(6)}` : 'N/A'}`);
  console.log(`│ Distance Home: ${distanceHomeM !== undefined ? `${distanceHomeM.toFixed(1)}m` : 'N/A'} | Office: ${distanceOfficeM !== undefined ? `${distanceOfficeM.toFixed(1)}m` : 'N/A'}`);
  console.log(`│ Is Home      : ${isHome}`);
  console.log(`│ Is Office    : ${isOffice}`);
  console.log(`│ → Context    : ${result.context}`);
  console.log(`│ → Confidence : ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`│ → Profile    : ${result.profile.mode}`);
  console.log('└──────────────────────────────────────────');

  syncHomeDetection(data).catch(() => {});

  return result;
}
