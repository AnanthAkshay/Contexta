import { NativeModules } from 'react-native';

/**
 * Mock WiFi Bridge — Home Detection
 *
 * Simulates the data that will come from the Android native module
 * (HomeDetector.java) once the React Native bridge is wired up.
 *
 * Uses a hardcoded home SSID for demo purposes.
 */

export interface HomeData {
  /** Whether user is currently at home */
  isHome: boolean;
  /** Currently connected WiFi SSID */
  currentSSID: string;
  /** Stored home WiFi SSID */
  homeSSID: string;
  /** Active profile mode */
  profileMode: 'HOME' | 'OFFICE' | 'AWAY';
  /** Unix epoch seconds */
  timestamp: number;

  // Dual-signal GPS fields
  latitude?: number | null;
  longitude?: number | null;
  homeLatitude?: number | null;
  homeLongitude?: number | null;

  // Office GPS fields
  officeSSID?: string;
  officeLatitude?: number | null;
  officeLongitude?: number | null;
}

export interface HomeProfile {
  /** Profile mode */
  mode: 'HOME' | 'OFFICE' | 'AWAY';
  /** Wallpaper hint — preview image identifier */
  wallpaperHint: string;
  /** Volume level description */
  volumeLevel: string;
  /** Notification grouping preference */
  notificationGrouping: string;
  /** Simulated Bluetooth device */
  bluetoothDevice: string;
}

// ── State ────────────────────────────────────────────────────

/** Hardcoded home SSID for demo — matches Android default */
let storedHomeSSID = 'MyHomeWiFi';

/** Hardcoded home coordinates for demo */
let storedHomeLat = 37.7749;
let storedHomeLon = -122.4194;

/** Stored office SSID for demo */
let storedOfficeSSID = 'OfficeWiFi_5G';

/** Stored office coordinates for demo */
let storedOfficeLat = 37.7894;
let storedOfficeLon = -122.4014;

/** Simulated current SSID — starts as home for demo */
let simulatedCurrentSSID = 'MyHomeWiFi';

/** Simulated current coordinates */
let simulatedLat = 37.7749;
let simulatedLon = -122.4194;

/** Whether to simulate being at home */
let simulateAtHome = true;

// ── Public API ───────────────────────────────────────────────

/**
 * Reads the current WiFi state.
 *
 * Tries to call the Android native module's WifiModule.getCurrentSSID().
 * Falls back to simulation if unavailable or on error.
 */
export async function getWiFiState(): Promise<HomeData> {
  try {
    const nativeModule = NativeModules.WifiModule;
    if (nativeModule && typeof nativeModule.getCurrentSSID === 'function') {
      const currentSSID = await nativeModule.getCurrentSSID();
      if (typeof currentSSID === 'string') {
        console.log(`[HomeBridge] Real WiFi SSID: ${currentSSID}`);
        const isHome = currentSSID === storedHomeSSID;
        return {
          isHome,
          currentSSID,
          homeSSID: storedHomeSSID,
          profileMode: isHome ? 'HOME' : 'AWAY',
          timestamp: Math.floor(Date.now() / 1000),
          homeLatitude: storedHomeLat,
          homeLongitude: storedHomeLon,
        };
      }
    }
  } catch (error) {
    console.log('[HomeBridge] Falling back to mock', error);
  }

  console.log('[HomeBridge] Falling back to mock');
  // Simulate ~150ms bridge latency
  await new Promise((resolve) => setTimeout(resolve, 150));

  const currentSSID = simulateAtHome ? storedHomeSSID : storedOfficeSSID;
  const isHome = currentSSID === storedHomeSSID;

  return {
    isHome,
    currentSSID,
    homeSSID: storedHomeSSID,
    profileMode: isHome ? 'HOME' : (currentSSID === storedOfficeSSID ? 'OFFICE' : 'AWAY'),
    timestamp: Math.floor(Date.now() / 1000),
    latitude: simulateAtHome ? storedHomeLat : storedOfficeLat,
    longitude: simulateAtHome ? storedHomeLon : storedOfficeLon,
    homeLatitude: storedHomeLat,
    homeLongitude: storedHomeLon,
    officeSSID: storedOfficeSSID,
    officeLatitude: storedOfficeLat,
    officeLongitude: storedOfficeLon,
  };
}

/**
 * Gets the home profile settings for the current state.
 */
export function getHomeProfile(modeOrIsHome: 'HOME' | 'OFFICE' | 'AWAY' | boolean): HomeProfile {
  const mode = typeof modeOrIsHome === 'boolean'
    ? (modeOrIsHome ? 'HOME' : 'AWAY')
    : modeOrIsHome;

  if (mode === 'HOME') {
    return {
      mode: 'HOME',
      wallpaperHint: 'personal_wallpaper',
      volumeLevel: '60%',
      notificationGrouping: 'personal',
      bluetoothDevice: 'Living Room Speaker',
    };
  } else if (mode === 'OFFICE') {
    return {
      mode: 'OFFICE',
      wallpaperHint: 'office_wallpaper',
      volumeLevel: 'vibrate',
      notificationGrouping: 'work',
      bluetoothDevice: 'Office Headphones',
    };
  } else {
    return {
      mode: 'AWAY',
      wallpaperHint: 'default_wallpaper',
      volumeLevel: 'vibrate',
      notificationGrouping: 'work',
      bluetoothDevice: 'none',
    };
  }
}

/**
 * Simulates saving the current WiFi as home.
 * (In the real app, calls HomeDetector.setCurrentAsHome())
 *
 * @returns the saved SSID
 */
export function setCurrentAsHome(latitude?: number, longitude?: number): string {
  storedHomeSSID = simulatedCurrentSSID;
  if (latitude !== undefined && longitude !== undefined) {
    storedHomeLat = latitude;
    storedHomeLon = longitude;
    console.log(`[HomeBridge] Home SSID saved: ${storedHomeSSID} with coordinates (${storedHomeLat}, ${storedHomeLon})`);
  } else {
    console.log(`[HomeBridge] Home SSID saved: ${storedHomeSSID}`);
  }
  return storedHomeSSID;
}

/**
 * Get the stored home coordinates.
 */
export function getHomeCoordinates(): { latitude: number; longitude: number } {
  return { latitude: storedHomeLat, longitude: storedHomeLon };
}

/**
 * Manually set home coordinates.
 */
export function setHomeCoordinates(lat: number, lon: number): void {
  storedHomeLat = lat;
  storedHomeLon = lon;
  console.log(`[HomeBridge] Home coordinates manually set: (${lat}, ${lon})`);
}

/**
 * Manually set the home SSID.
 */
export function setHomeSSID(ssid: string): void {
  storedHomeSSID = ssid;
  console.log(`[HomeBridge] Home SSID manually set: ${ssid}`);
}

/**
 * Get the stored home SSID.
 */
export function getHomeSSID(): string {
  return storedHomeSSID;
}

/**
 * Simulates saving the current WiFi as office.
 * @returns the saved SSID
 */
export function setCurrentAsOffice(latitude?: number, longitude?: number): string {
  storedOfficeSSID = simulatedCurrentSSID;
  if (latitude !== undefined && longitude !== undefined) {
    storedOfficeLat = latitude;
    storedOfficeLon = longitude;
    console.log(`[HomeBridge] Office SSID saved: ${storedOfficeSSID} with coordinates (${storedOfficeLat}, ${storedOfficeLon})`);
  } else {
    console.log(`[HomeBridge] Office SSID saved: ${storedOfficeSSID}`);
  }
  return storedOfficeSSID;
}

/**
 * Get the stored office coordinates.
 */
export function getOfficeCoordinates(): { latitude: number; longitude: number } {
  return { latitude: storedOfficeLat, longitude: storedOfficeLon };
}

/**
 * Get the stored office SSID.
 */
export function getOfficeSSID(): string {
  return storedOfficeSSID;
}

/**
 * Manually set the office SSID.
 */
export function setOfficeSSID(ssid: string): void {
  storedOfficeSSID = ssid;
  console.log(`[HomeBridge] Office SSID manually set: ${ssid}`);
}

/**
 * Toggle simulated location (home vs away) for demo.
 */
export function toggleSimulatedLocation(): boolean {
  simulateAtHome = !simulateAtHome;
  simulatedCurrentSSID = simulateAtHome ? storedHomeSSID : storedOfficeSSID;
  simulatedLat = simulateAtHome ? storedHomeLat : storedOfficeLat;
  simulatedLon = simulateAtHome ? storedHomeLon : storedOfficeLon;
  console.log(`[HomeBridge] Simulated location: ${simulateAtHome ? 'HOME' : 'AWAY'} (${simulatedLat}, ${simulatedLon})`);
  return simulateAtHome;
}

/**
 * Injects "at home" state for demo.
 */
export function injectHomeState(): HomeData {
  return {
    isHome: true,
    currentSSID: storedHomeSSID,
    homeSSID: storedHomeSSID,
    profileMode: 'HOME',
    timestamp: Math.floor(Date.now() / 1000),
    latitude: storedHomeLat,
    longitude: storedHomeLon,
    homeLatitude: storedHomeLat,
    homeLongitude: storedHomeLon,
    officeSSID: storedOfficeSSID,
    officeLatitude: storedOfficeLat,
    officeLongitude: storedOfficeLon,
  };
}

/**
 * Injects "office" state for demo.
 */
export function injectOfficeState(): HomeData {
  return {
    isHome: false,
    currentSSID: storedOfficeSSID,
    homeSSID: storedHomeSSID,
    profileMode: 'OFFICE',
    timestamp: Math.floor(Date.now() / 1000),
    latitude: storedOfficeLat,
    longitude: storedOfficeLon,
    homeLatitude: storedHomeLat,
    homeLongitude: storedHomeLon,
    officeSSID: storedOfficeSSID,
    officeLatitude: storedOfficeLat,
    officeLongitude: storedOfficeLon,
  };
}

/**
 * Injects "away" state for demo.
 */
export function injectAwayState(): HomeData {
  return {
    isHome: false,
    currentSSID: 'PublicWiFi_Free',
    homeSSID: storedHomeSSID,
    profileMode: 'AWAY',
    timestamp: Math.floor(Date.now() / 1000),
    latitude: 37.7600,
    longitude: -122.4300,
    homeLatitude: storedHomeLat,
    homeLongitude: storedHomeLon,
    officeSSID: storedOfficeSSID,
    officeLatitude: storedOfficeLat,
    officeLongitude: storedOfficeLon,
  };
}
