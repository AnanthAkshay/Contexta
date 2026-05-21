package com.contexta.android.detector;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.provider.CalendarContract;
import android.util.Log;

import com.contexta.android.model.CalendarEventResult;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Reads upcoming calendar events from the device and detects whether
 * a "meeting" is currently happening (within a ±30-minute window).
 *
 * Detection is keyword-based — no ML required.
 */
public class MeetingDetector {

    private static final String TAG = "MeetingDetector";

    /** Keywords that signal a meeting-type event (all lowercase) */
    private static final String[] MEETING_KEYWORDS = {
            "meeting", "call", "standup", "class"
    };

    /** Time window: 30 minutes in milliseconds */
    private static final long WINDOW_MS = 30 * 60 * 1000L;

    private final Context context;

    public MeetingDetector(Context context) {
        this.context = context.getApplicationContext();
    }

    // ── Public API ───────────────────────────────────────────

    /**
     * Scans the device calendar for events within ±30 min of now
     * and returns the first detected meeting, or {@code CalendarEventResult.none()}.
     */
    public CalendarEventResult detect() {
        List<CalendarEventResult> results = fetchAndClassify();

        if (results.isEmpty()) {
            Log.i(TAG, "No calendar events found in the ±30-min window.");
            return CalendarEventResult.none();
        }

        // Return the first meeting-type event, or the first event if none are meetings
        for (CalendarEventResult r : results) {
            if (r.isMeeting()) {
                return r;
            }
        }

        // No meeting keyword matched — return the first event as NONE
        return results.get(0);
    }

    /**
     * Returns *all* classified events in the window (useful for debugging
     * or future multi-event logic).
     */
    public List<CalendarEventResult> detectAll() {
        return fetchAndClassify();
    }

    // ── Core logic ───────────────────────────────────────────

    /**
     * Queries {@link CalendarContract.Instances} for events within
     * [now − 30 min, now + 30 min] and classifies each one.
     */
    private List<CalendarEventResult> fetchAndClassify() {
        List<CalendarEventResult> results = new ArrayList<>();

        long now = System.currentTimeMillis();
        long rangeStart = now - WINDOW_MS;
        long rangeEnd = now + WINDOW_MS;

        // ── Build the Instances query ────────────────────────
        // CalendarContract.Instances is a virtual table that expands
        // recurring events, so we use the builder to set the time range.
        android.net.Uri.Builder builder =
                CalendarContract.Instances.CONTENT_URI.buildUpon();
        android.content.ContentUris.appendId(builder, rangeStart);
        android.content.ContentUris.appendId(builder, rangeEnd);

        String[] projection = {
                CalendarContract.Instances.TITLE,
                CalendarContract.Instances.BEGIN
        };

        ContentResolver resolver = context.getContentResolver();
        Cursor cursor = null;

        try {
            cursor = resolver.query(
                    builder.build(),
                    projection,
                    null,   // selection
                    null,   // selectionArgs
                    CalendarContract.Instances.BEGIN + " ASC" // order by start
            );

            if (cursor == null) {
                Log.w(TAG, "Calendar query returned null cursor.");
                return results;
            }

            Log.d(TAG, "Found " + cursor.getCount() + " event(s) in window.");

            int titleIdx = cursor.getColumnIndex(CalendarContract.Instances.TITLE);
            int beginIdx = cursor.getColumnIndex(CalendarContract.Instances.BEGIN);

            while (cursor.moveToNext()) {
                String title = cursor.getString(titleIdx);
                long startMs = cursor.getLong(beginIdx);

                if (title == null) title = "(untitled)";

                // ── Classify ─────────────────────────────────
                String eventType = classify(title);

                // ── Log ──────────────────────────────────────
                String formattedTime = formatTime(startMs);
                Log.i(TAG, "Event: \"" + title + "\" | Time: " + formattedTime
                        + " | Type: " + eventType);

                // ── Build result ─────────────────────────────
                long timestampSec = startMs / 1000;
                double confidence = "MEETING".equals(eventType) ? 0.91 : 0.60;
                results.add(new CalendarEventResult(eventType, title, confidence, timestampSec));
            }

        } catch (SecurityException e) {
            Log.e(TAG, "READ_CALENDAR permission not granted.", e);
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        return results;
    }

    // ── Classification ───────────────────────────────────────

    /**
     * Simple keyword-based meeting detection.
     *
     * @param title the calendar event title
     * @return "MEETING" if any keyword matches, otherwise "NONE"
     */
    private String classify(String title) {
        String lower = title.toLowerCase(Locale.ROOT);
        for (String keyword : MEETING_KEYWORDS) {
            if (lower.contains(keyword)) {
                return "MEETING";
            }
        }
        return "NONE";
    }

    // ── Formatting helpers ───────────────────────────────────

    private String formatTime(long millis) {
        SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());
        return sdf.format(new Date(millis));
    }
}
