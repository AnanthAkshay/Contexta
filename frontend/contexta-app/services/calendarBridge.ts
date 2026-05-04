/**
 * Mock Android Calendar Bridge
 *
 * Simulates the data that will come from the Android native module
 * (MeetingDetector.java) once the React Native bridge is wired up.
 *
 * Replace this file's implementation with a real NativeModules call
 * when the native bridge is ready.
 */

export interface CalendarEvent {
  /** "MEETING" | "NONE" */
  event: string;
  /** Calendar event title */
  title: string;
  /** Unix epoch seconds */
  timestamp: number;
}

// ── Mock data pool ───────────────────────────────────────────
// Demo-optimised: all events are meetings to guarantee reliable
// detection during live demos. The Android native module handles
// real MEETING/NONE classification via keyword matching.

const MOCK_EVENTS: CalendarEvent[] = [
  { event: 'MEETING', title: 'Sprint Standup',  timestamp: 0 },
  { event: 'MEETING', title: 'Client Call',     timestamp: 0 },
  { event: 'MEETING', title: 'Team Meeting',    timestamp: 0 },
  { event: 'MEETING', title: 'CS101 Class',     timestamp: 0 },
  { event: 'MEETING', title: 'Design Review',   timestamp: 0 },
  { event: 'MEETING', title: '1:1 with Manager',timestamp: 0 },
];

let callCount = 0;

// ── Public API ───────────────────────────────────────────────

/**
 * Simulates reading a calendar event from the Android native module.
 *
 * Cycles through different meeting titles on each call so the demo
 * feels dynamic. Adds a small artificial delay to mimic bridge latency.
 */
export async function getCalendarEvent(): Promise<CalendarEvent> {
  // Simulate ~250ms native bridge latency
  await new Promise((resolve) => setTimeout(resolve, 250));

  const event = MOCK_EVENTS[callCount % MOCK_EVENTS.length];
  callCount++;

  return {
    ...event,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Returns a hardcoded MEETING event (used by the "Inject Meeting" demo button).
 */
export function getInjectedMeetingEvent(): CalendarEvent {
  return {
    event: 'MEETING',
    title: 'Sprint Standup',
    timestamp: Math.floor(Date.now() / 1000),
  };
}
