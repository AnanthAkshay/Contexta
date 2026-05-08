package com.contexta.android;

import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class MovementModule extends ReactContextBaseJavaModule {

    private final SensorManager sensorManager;
    private final Handler handler = new Handler(Looper.getMainLooper());

    public MovementModule(ReactApplicationContext reactContext) {
        super(reactContext);
        sensorManager = (SensorManager) reactContext.getSystemService(ReactApplicationContext.SENSOR_SERVICE);
    }

    @Override
    public String getName() {
        return "MovementModule";
    }

    @ReactMethod
    public void getMovementData(final Promise promise) {
        final List<Double> magnitudes = new ArrayList<>();
        final Sensor accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);

        if (accelerometer == null) {
            promise.resolve("{\"isMoving\":false,\"variance\":0.000,\"transportMode\":\"stationary\"}");
            return;
        }

        final SensorEventListener listener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent event) {
                float x = event.values[0];
                float y = event.values[1];
                float z = event.values[2];
                double magnitude = Math.sqrt(x * x + y * y + z * z);
                magnitudes.add(magnitude);
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int accuracy) {}
        };

        sensorManager.registerListener(listener, accelerometer, SensorManager.SENSOR_DELAY_GAME);

        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                sensorManager.unregisterListener(listener);
                processMovementData(magnitudes, promise);
            }
        }, 2000);
    }

    private void processMovementData(List<Double> magnitudes, Promise promise) {
        if (magnitudes.isEmpty()) {
            promise.resolve("{\"isMoving\":false,\"variance\":0.000,\"transportMode\":\"stationary\"}");
            return;
        }

        double sum = 0;
        for (double m : magnitudes) {
            sum += (m - 9.81);
        }
        double mean = sum / magnitudes.size();

        double sqDiffSum = 0;
        for (double m : magnitudes) {
            double diff = (m - 9.81) - mean;
            sqDiffSum += diff * diff;
        }
        double variance = sqDiffSum / magnitudes.size();

        String transportMode = "stationary";
        boolean isMoving = false;

        if (variance > 3.0) {
            transportMode = "driving";
            isMoving = true;
        } else if (variance > 0.8) {
            transportMode = "walking";
            isMoving = true;
        }

        String result = String.format(Locale.US,
                "{\"isMoving\":%b,\"variance\":%.3f,\"transportMode\":\"%s\"}",
                isMoving, variance, transportMode);
        
        promise.resolve(result);
    }
}
