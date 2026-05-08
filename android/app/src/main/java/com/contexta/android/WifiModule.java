package com.contexta.android;

import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class WifiModule extends ReactContextBaseJavaModule {

    public WifiModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "WifiModule";
    }

    @ReactMethod
    public void getCurrentSSID(Promise promise) {
        try {
            WifiManager wifiManager = (WifiManager) getReactApplicationContext()
                    .getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            
            if (wifiManager == null) {
                promise.resolve("");
                return;
            }

            WifiInfo info = wifiManager.getConnectionInfo();
            if (info == null) {
                promise.resolve("");
                return;
            }

            String ssid = info.getSSID();
            
            // Strip quotes
            if (ssid != null && ssid.startsWith("\"") && ssid.endsWith("\"")) {
                ssid = ssid.substring(1, ssid.length() - 1);
            }

            if (ssid == null || ssid.equals("<unknown ssid>") || ssid.isEmpty()) {
                promise.resolve("");
            } else {
                promise.resolve(ssid);
            }
        } catch (Exception e) {
            promise.reject("WIFI_ERROR", e.getMessage());
        }
    }
}
