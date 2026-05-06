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
  profileMode: 'HOME' | 'AWAY';
  /** Unix epoch seconds */
  timestamp: number;
}

export interface HomeProfile {
  /** Profile mode */
  mode: 'HOME' | 'AWAY';
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

/** Simulated current SSID — starts as home for demo */
let simulatedCurrentSSID = 'MyHomeWiFi';

/** Whether to simulate being at home */
let simulateAtHome = true;

// ── Public API ───────────────────────────────────────────────

/**
 * Reads the current WiFi state (mock).
 *
 * In the real app, this would call HomeDetector.detect()
 * via the React Native bridge.
 */
export async function getWiFiState(): Promise<HomeData> {
  // Simulate ~150ms bridge latency
  await new Promise((resolve) => setTimeout(resolve, 150));

  const currentSSID = simulateAtHome ? storedHomeSSID : 'OfficeWiFi_5G';
  const isHome = currentSSID === storedHomeSSID;

  return {
    isHome,
    currentSSID,
    homeSSID: storedHomeSSID,
    profileMode: isHome ? 'HOME' : 'AWAY',
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Gets the home profile settings for the current state.
 */
export function getHomeProfile(isHome: boolean): HomeProfile {
  if (isHome) {
    return {
      mode: 'HOME',
      wallpaperHint: 'personal_wallpaper',
      volumeLevel: '60%',
      notificationGrouping: 'personal',
      bluetoothDevice: 'Living Room Speaker',
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
export function setCurrentAsHome(): string {
  storedHomeSSID = simulatedCurrentSSID;
  console.log(`[HomeBridge] Home SSID saved: ${storedHomeSSID}`);
  return storedHomeSSID;
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
 * Toggle simulated location (home vs away) for demo.
 */
export function toggleSimulatedLocation(): boolean {
  simulateAtHome = !simulateAtHome;
  simulatedCurrentSSID = simulateAtHome ? storedHomeSSID : 'OfficeWiFi_5G';
  console.log(`[HomeBridge] Simulated location: ${simulateAtHome ? 'HOME' : 'AWAY'}`);
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
  };
}

/**
 * Injects "away" state for demo.
 */
export function injectAwayState(): HomeData {
  return {
    isHome: false,
    currentSSID: 'OfficeWiFi_5G',
    homeSSID: storedHomeSSID,
    profileMode: 'AWAY',
    timestamp: Math.floor(Date.now() / 1000),
  };
}
