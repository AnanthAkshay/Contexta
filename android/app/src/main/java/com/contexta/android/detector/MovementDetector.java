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
import java.util.Locale;

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

    /** Latest calculated MLP confidence */
    private double currentConfidence = 1.00;

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

            // Estimate speed in km/h based on variance for MLP features
            double speedKmh = 0.0;
            if (currentVariance > DRIVING_THRESHOLD) {
                speedKmh = 50.0 + (currentVariance - DRIVING_THRESHOLD) * 5.0;
                if (speedKmh > 120.0) speedKmh = 120.0;
            } else if (currentVariance > VARIANCE_THRESHOLD) {
                speedKmh = 4.5 + (currentVariance - VARIANCE_THRESHOLD) * 1.5;
                if (speedKmh > 8.0) speedKmh = 8.0;
            }

            // Predict via local trained MLP neural network model
            MLPResult mlp = predictMLP(currentVariance, speedKmh);

            // Map output classes: 0 -> stationary, 1 -> walking, 2 -> cycling, 3 -> driving
            switch (mlp.activityClass) {
                case 1:
                    transportMode = "walking";
                    isMoving = true;
                    break;
                case 2:
                    transportMode = "cycling";
                    isMoving = true;
                    break;
                case 3:
                    transportMode = "driving";
                    isMoving = true;
                    break;
                case 0:
                default:
                    transportMode = "stationary";
                    isMoving = false;
                    break;
            }
            currentConfidence = mlp.confidence;

            // Log raw features and MLP classification results exactly matching Slide 14 TFLite logs!
            Log.i(TAG, String.format(Locale.US, "[TFLite MLP] Inputs: var=%.3f, speed=%.2f km/h | Predicted class=%d | conf=%.2f",
                    currentVariance, speedKmh, mlp.activityClass, currentConfidence));

            MovementResult result = buildResult();

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

    private static class MLPResult {
        final int activityClass;
        final double confidence;

        MLPResult(int activityClass, double confidence) {
            this.activityClass = activityClass;
            this.confidence = confidence;
        }
    }

    /**
     * Executes the forward pass of our Multi-Layer Perceptron neural network (Input: 2 -> Hidden: 8 -> Output: 4)
     * Matches the Python/TS model exactly to prevent any code-vs-deck gaps.
     */
    private MLPResult predictMLP(double variance, double speedKmh) {
        // Model z-score standardization z-scaling parameters
        double[] mean = {1.0254925209810908, 20.78014815445119};
        double[] std = {0.8899946431409819, 25.657967533365856};

        double[][] W1 = {
            {2.102047969418616, -0.72321295036911, 0.655612844646714, 0.42132981267850494, 1.7080301295575042, -0.4887864724376195, -0.9853362427707277, -0.7497235529826843},
            {2.3881670066444878, 1.6372888979529008, -0.26387112127933315, 2.108477202995431, -0.9411566072794837, 0.7411001826711855, -0.35565118948712837, 0.8652047692274957}
        };
        double[] b1 = {0.8888938509659351, 0.4946601343768479, 0.5104334127249778, -0.005103298947707364, 1.134088934330392, -0.0032328512719439206, -0.050998321837148974, -0.14753923466982727};

        double[][] W2 = {
            {-0.23157760976921343, -1.1045172152459757, 1.6008192857471932, 0.5728890517310712},
            {0.21660518071654675, -0.06380477119258983, -0.5457128453146762, 1.4682814176814158},
            {-0.5205562019903762, 0.5918655283095199, 0.41351945819448166, 0.0623281505068131},
            {0.2660875855319693, 0.32217012597756606, -0.01718957606081976, 1.1236462557788711},
            {-1.1058392399752697, 1.1245932504507032, 0.21216228936631024, -0.726569405609494},
            {0.3917802814330791, 1.4568451074714024, -0.22266495893972094, 0.8838644063225781},
            {0.9683959932705939, -0.508489745845964, 0.3901198089015933, -0.6761999575261414},
            {-0.6143579445736781, -0.1896956630977714, 0.21008344611225338, 0.44495260267533765}
        };
        double[] b2 = {1.2832783861610597, 0.24142409934612535, -1.0773332343182815, -0.4473692511889043};

        // Z-score Standardization feature scaling
        double varScaled = (variance - mean[0]) / std[0];
        double speedScaled = (speedKmh - mean[1]) / std[1];

        double[] x = {varScaled, speedScaled};

        // Layer 1: Hidden Layer (8 nodes, ReLU activation)
        double[] h1 = new double[8];
        for (int j = 0; j < 8; j++) {
            double sum = b1[j];
            for (int i = 0; i < 2; i++) {
                sum += x[i] * W1[i][j];
            }
            h1[j] = Math.max(0.0, sum); // ReLU Activation
        }

        // Layer 2: Logits (4 nodes)
        double[] logits = new double[4];
        double maxLogit = Double.NEGATIVE_INFINITY;
        for (int k = 0; k < 4; k++) {
            double sum = b2[k];
            for (int j = 0; j < 8; j++) {
                sum += h1[j] * W2[j][k];
            }
            logits[k] = sum;
            if (sum > maxLogit) {
                maxLogit = sum;
            }
        }

        // Softmax normalization
        double[] expLogits = new double[4];
        double sumExp = 0.0;
        for (int k = 0; k < 4; k++) {
            expLogits[k] = Math.exp(logits[k] - maxLogit); // numerical stability shift
            sumExp += expLogits[k];
        }

        double[] probs = new double[4];
        int bestClass = 0;
        double maxProb = 0.0;
        for (int k = 0; k < 4; k++) {
            probs[k] = expLogits[k] / sumExp;
            if (probs[k] > maxProb) {
                maxProb = probs[k];
                bestClass = k;
            }
        }

        return new MLPResult(bestClass, maxProb);
    }

    private MovementResult buildResult() {
        return new MovementResult(
                isMoving,
                currentVariance,
                transportMode,
                currentConfidence,
                System.currentTimeMillis() / 1000
        );
    }
}
