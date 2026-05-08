package com.contexta.android;

import android.Manifest;
import android.content.ContentResolver;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CalendarContract;
import androidx.core.content.ContextCompat;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.Locale;

public class CalendarModule extends ReactContextBaseJavaModule {

    public CalendarModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "CalendarModule";
    }

    @ReactMethod
    public void getCurrentCalendarEvent(Promise promise) {
        try {
            ReactApplicationContext context = getReactApplicationContext();
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALENDAR)
                    != PackageManager.PERMISSION_GRANTED) {
                promise.resolve("{\"event\":\"NONE\",\"title\":\"\",\"timestamp\":0}");
                return;
            }

            ContentResolver resolver = context.getContentResolver();
            long now = System.currentTimeMillis();

            String[] projection = new String[]{
                    CalendarContract.Events.TITLE,
                    CalendarContract.Events.DTSTART,
                    CalendarContract.Events.DTEND
            };

            String selection = CalendarContract.Events.DTSTART + " <= ? AND "
                    + CalendarContract.Events.DTEND + " >= ? AND "
                    + CalendarContract.Events.DELETED + " = 0";
            String[] selectionArgs = new String[]{String.valueOf(now), String.valueOf(now)};

            try (Cursor cursor = resolver.query(
                    CalendarContract.Events.CONTENT_URI,
                    projection,
                    selection,
                    selectionArgs,
                    null)) {

                String[] keywords = new String[]{
                        "meeting",
                        "standup",
                        "call",
                        "sync",
                        "review",
                        "class",
                        "lecture",
                        "1:1",
                        "interview"
                };

                String matchedTitle = null;
                long matchedStart = 0;

                if (cursor != null) {
                    while (cursor.moveToNext()) {
                        String title = cursor.getString(cursor.getColumnIndexOrThrow(CalendarContract.Events.TITLE));
                        long dtstart = cursor.getLong(cursor.getColumnIndexOrThrow(CalendarContract.Events.DTSTART));
                        if (title == null) {
                            continue;
                        }

                        String lowerTitle = title.toLowerCase(Locale.US);
                        for (String keyword : keywords) {
                            if (lowerTitle.contains(keyword.toLowerCase(Locale.US))) {
                                matchedTitle = title;
                                matchedStart = dtstart;
                                break;
                            }
                        }

                        if (matchedTitle != null) {
                            break;
                        }
                    }
                }

                if (matchedTitle != null) {
                    String result = "{\"event\":\"MEETING\",\"title\":\""
                            + escapeJson(matchedTitle)
                            + "\",\"timestamp\":"
                            + matchedStart
                            + "}";
                    promise.resolve(result);
                } else {
                    promise.resolve("{\"event\":\"NONE\",\"title\":\"\",\"timestamp\":0}");
                }
            }
        } catch (Exception e) {
            promise.reject("CALENDAR_ERROR", e.getMessage());
        }
    }

    private String escapeJson(String text) {
        return text.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
