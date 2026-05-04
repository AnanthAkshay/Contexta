/**
 * Context Detection Logic Layer
 *
 * Takes raw calendar event data from the Android bridge and
 * produces a structured context result for the UI.
 */

import type { CalendarEvent } from './calendarBridge';

// ── Types ────────────────────────────────────────────────────

export type ContextType = 'MEETING' | 'IDLE';
export type ContextSource = 'Calendar' | 'Manual' | 'Sensor';
export type ActionStatus = 'DND Enabled' | 'Normal Mode';

export interface ContextResult {
  /** Detected context — "MEETING" or "IDLE" */
  context: ContextType;
  /** Confidence score (0.0 – 1.0) */
  confidence: number;
  /** Where the context came from */
  source: ContextSource;
  /** Original event title (empty when IDLE) */
  eventTitle: string;
  /** Human-readable explanation of why this context was detected */
  reason: string;
  /** Human-readable timestamp */
  detectedAt: string;
  /** Current system action status */
  action: ActionStatus;
}

// ── Core detection function ──────────────────────────────────

/**
 * Determines the user context from a calendar event.
 *
 * Rules:
 *   event == "MEETING"  →  context = MEETING, confidence = 0.91, action = DND Enabled
 *   otherwise           →  context = IDLE,    confidence = 0.60, action = Normal Mode
 */
export function determineContext(
  eventData: CalendarEvent,
  source: ContextSource = 'Calendar',
): ContextResult {
  const isMeeting = eventData.event === 'MEETING';

  const result: ContextResult = {
    context: isMeeting ? 'MEETING' : 'IDLE',
    confidence: isMeeting ? 0.91 : 0.60,
    source,
    eventTitle: isMeeting ? eventData.title : '',
    reason: isMeeting
      ? `Calendar event "${eventData.title}" detected`
      : 'No active meeting in calendar',
    detectedAt: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    action: isMeeting ? 'DND Enabled' : 'Normal Mode',
  };

  // Debug logging (visible in Metro / Logcat)
  console.log('┌─── Context Detection ───────────────────');
  console.log(`│ Event Title : ${eventData.title}`);
  console.log(`│ Event Type  : ${eventData.event}`);
  console.log(`│ Timestamp   : ${eventData.timestamp}`);
  console.log(`│ → Context   : ${result.context}`);
  console.log(`│ → Confidence: ${result.confidence}`);
  console.log(`│ → Source    : ${result.source}`);
  console.log(`│ → Reason    : ${result.reason}`);
  console.log(`│ → Action    : ${result.action}`);
  console.log('└──────────────────────────────────────────');

  return result;
}
