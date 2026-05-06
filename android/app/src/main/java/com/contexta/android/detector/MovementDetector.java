package com.contexta.android.detector;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.contexta.android.model.MovementResult;

import java.util.LinkedList;

/**
 * Detects user movement by reading the device accelerometer.
 *
 * <h3>How it works</h3>
 * <ol>
 *   <li>Registers for accelerometer updates at ~500ms intervals</li>
 *   <li>Maintains a rolling 5-second window of acceleration magnitudes</li>
 *   <li>Computes variance over the window</li>
 *   <li>If variance > 0.8, classifies as "moving"</li>
 *   <li>Infers transport mode via simple thresholds:
 *       <ul>
 *         <li>variance > 3.0 → "driving"</li>
 *         <li>variance > 0.8 → "walking"</li>
 *         <li>else → "stationary"</li>
 *       </ul>
 *   </li>
 * </ol>
 *
 * <h3>MVP simplifications</h3>
 * <ul>
 *   <li>Transport mode uses fixed thresholds, no real ML classifier</li>
 *   <li>ETA calculation returns a hardcoded static string</li>
 * </ul>
 */
public class MovementDetector implements SensorEventListener {

    private static final String TAG = "MovementDetector";

    /** Variance threshold — above this, user is considered "moving" */
    private static final double VARIANCE_THRESHOLD = 0.8;

    /** Threshold for classifying "driving" vs "walking" */
    private static final double DRIVING_THRESHOLD = 3.0;

    /** Rolling window size in number of samples (~500ms each → 5s = 10 samples) */
    private static final int WINDOW_SIZE = 10;

    /** Sampling interval in microseconds (500ms = 500,000μs) */
    private static final int SAMPLING_INTERVAL_US = 500_000;

    private final Context context;
    private final SensorManager sensorManager;
    private final Sensor accelerometer;

    /** Rolling window of acceleration magnitudes */
    private final LinkedList<Double> magnitudeWindow = new LinkedList<>();

    /** Latest computed variance */
    private double currentVariance = 0.0;

    /** Whether user is currently moving */
    private boolean isMoving = false;

    /** Inferred transport mode */
    private String transportMode = "stationary";

    /** Callback for detection results */
    private MovementCallback callback;

    /** Handler for periodic detection checks */
    private final Handler handler = new Handler(Looper.getMainLooper());

    public interface MovementCallback {
        void onMovementDetected(MovementResult result);
    }

    public MovementDetector(Context context) {
        this.context = context.getApplicationContext();
        this.sensorManager = (SensorManager)
                this.context.getSystemService(Context.SENSOR_SERVICE);
        this.accelerometer = sensorManager != null
                ? sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
                : null;

        if (accelerometer == null) {
            Log.w(TAG, "No accelerometer sensor available on this device.");
        }
    }

    // ── Public API ───────────────────────────────────────────

    /**
     * Start listening to the accelerometer.
     *
     * @param callback receives MovementResult whenever detection updates
     */
    public void startDetection(MovementCallback callback) {
        this.callback = callback;

        if (accelerometer == null) {
            Log.e(TAG, "Cannot start — no accelerometer sensor.");
            return;
        }

        Log.i(TAG, "┌─── Starting Movement Detection ────────────");
        Log.i(TAG, "│ Sensor    : " + accelerometer.getName());
        Log.i(TAG, "│ Interval  : 500ms");
        Log.i(TAG, "│ Window    : 5s (" + WINDOW_SIZE + " samples)");
        Log.i(TAG, "│ Threshold : " + VARIANCE_THRESHOLD);
        Log.i(TAG, "└─────────────────────────────────────────────");

        sensorManager.registerListener(this, accelerometer,
                SAMPLING_INTERVAL_US);
    }

    /**
     * Stop listening to the accelerometer and clean up.
     */
    public void stopDetection() {
        Log.i(TAG, "Stopping movement detection.");
        sensorManager.unregisterListener(this);
        magnitudeWindow.clear();
        handler.removeCallbacksAndMessages(null);
    }

    /**
     * Perform a one-shot detection using current state.
     * Useful when you don't want continuous monitoring.
     *
     * @return the current movement result
     */
    public MovementResult detectOnce() {
        return buildResult();
    }

    // ── SensorEventListener ─────────────────────────────────

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_ACCELEROMETER) return;

        float x = event.values[0];
        float y = event.values[1];
        float z = event.values[2];

        // Compute acceleration magnitude (subtract gravity ~9.81)
        double magnitude = Math.sqrt(x * x + y * y + z * z);

        // Add to rolling window
        magnitudeWindow.addLast(magnitude);
        if (magnitudeWindow.size() > WINDOW_SIZE) {
            magnitudeWindow.removeFirst();
        }

        // Only compute when we have enough samples
        if (magnitudeWindow.size() >= WINDOW_SIZE) {
            currentVariance = computeVariance();
            isMoving = currentVariance > VARIANCE_THRESHOLD;
            transportMode = classifyTransportMode(currentVariance);

            MovementResult result = buildResult();

            Log.d(TAG, String.format("Variance: %.3f | Moving: %s | Mode: %s",
                    currentVariance, isMoving, transportMode));

            if (callback != null) {
                callback.onMovementDetected(result);
            }
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        Log.d(TAG, "Accelerometer accuracy changed: " + accuracy);
    }

    // ── Internal ─────────────────────────────────────────────

    /**
     * Computes the variance of values in the rolling window.
     * Variance = Σ(xi - mean)² / N
     */
    private double computeVariance() {
        if (magnitudeWindow.isEmpty()) return 0.0;

        double sum = 0.0;
        for (double val : magnitudeWindow) {
            sum += val;
        }
        double mean = sum / magnitudeWindow.size();

        double varianceSum = 0.0;
        for (double val : magnitudeWindow) {
            varianceSum += (val - mean) * (val - mean);
        }

        return varianceSum / magnitudeWindow.size();
    }

    /**
     * Simple threshold-based transport mode classification.
     * MVP: no real ML classifier — uses fixed thresholds.
     *
     * @param variance the computed accelerometer variance
     * @return "driving", "walking", or "stationary"
     */
    private String classifyTransportMode(double variance) {
        if (variance > DRIVING_THRESHOLD) {
            return "driving";
        } else if (variance > VARIANCE_THRESHOLD) {
            return "walking";
        } else {
            return "stationary";
        }
    }

    private MovementResult buildResult() {
        return new MovementResult(
                isMoving,
                currentVariance,
                transportMode,
                System.currentTimeMillis() / 1000
        );
    }
}
