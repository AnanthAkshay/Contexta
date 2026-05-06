import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  TextInput, Platform, Alert,
} from 'react-native';

import { getHomeSSID, setHomeSSID, setCurrentAsHome, toggleSimulatedLocation } from '@/services/homeBridge';

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg: '#0B0D12', surface: '#141720', surfaceAlt: '#1A1E2A', border: '#1F2435',
  accent: '#6C63FF', home: '#A78BFA', homeActive: '#34D399',
  text: '#F0F0F5', textSec: '#8A8FA6', textDim: '#454B5E',
  danger: '#FF6B6B',
};

export default function SettingsScreen() {
  const [homeSSID, setHomeSSIDState] = useState(getHomeSSID());
  const [inputSSID, setInputSSID] = useState(homeSSID);
  const [saved, setSaved] = useState(false);

  const handleSaveSSID = useCallback(() => {
    if (inputSSID.trim()) {
      setHomeSSID(inputSSID.trim());
      setHomeSSIDState(inputSSID.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [inputSSID]);

  const handleSetCurrent = useCallback(() => {
    const ssid = setCurrentAsHome();
    if (ssid) {
      setHomeSSIDState(ssid);
      setInputSSID(ssid);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, []);

  const handleToggleLocation = useCallback(() => {
    const isHome = toggleSimulatedLocation();
    Alert.alert(
      'Demo Location',
      `Simulated location set to: ${isHome ? '🏠 HOME' : '🌍 AWAY'}`,
    );
  }, []);

  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.content} bounces={false}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={st.header}>
        <Text style={st.headerTitle}>Settings</Text>
        <Text style={st.headerSub}>Configure your Contexta preferences</Text>
      </View>

      {/* ── Home Network Configuration ────────────────── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>🏠 Home Network</Text>
        <Text style={st.sectionDesc}>
          Set your home WiFi SSID. Contexta will switch to Home Mode when it detects this network.
        </Text>

        <View style={st.inputRow}>
          <TextInput
            style={st.input}
            value={inputSSID}
            onChangeText={setInputSSID}
            placeholder="Enter WiFi SSID"
            placeholderTextColor={C.textDim}
          />
        </View>

        <View style={st.btnRow}>
          <Pressable
            style={({ pressed }) => [st.btn, st.btnPrimary, pressed && st.btnPressed]}
            onPress={handleSaveSSID}
          >
            <Text style={st.btnTxt}>💾 Save SSID</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.btn, st.btnHome, pressed && st.btnPressed]}
            onPress={handleSetCurrent}
          >
            <Text style={st.btnTxt}>📍 Set this as Home</Text>
          </Pressable>
        </View>

        {saved && (
          <View style={st.savedBanner}>
            <Text style={st.savedText}>✅ Home SSID saved: {homeSSID}</Text>
          </View>
        )}

        <View style={st.infoCard}>
          <Text style={st.infoLabel}>Current Home SSID</Text>
          <Text style={st.infoValue}>{homeSSID}</Text>
        </View>
      </View>

      {/* ── Demo Controls ─────────────────────────────── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>🔧 Demo Controls</Text>
        <Text style={st.sectionDesc}>
          These controls let you simulate location changes for testing.
        </Text>

        <Pressable
          style={({ pressed }) => [st.btn, st.btnAccent, pressed && st.btnPressed, { marginTop: 8 }]}
          onPress={handleToggleLocation}
        >
          <Text style={st.btnTxt}>🔄 Toggle Home/Away (Demo)</Text>
        </Pressable>
      </View>

      {/* ── Detection Thresholds ──────────────────────── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>📊 Detection Thresholds</Text>

        <View style={st.thresholdRow}>
          <Text style={st.thresholdLabel}>Movement Variance</Text>
          <Text style={st.thresholdValue}>&gt; 0.8</Text>
        </View>
        <View style={st.thresholdRow}>
          <Text style={st.thresholdLabel}>Driving Variance</Text>
          <Text style={st.thresholdValue}>&gt; 3.0</Text>
        </View>
        <View style={st.thresholdRow}>
          <Text style={st.thresholdLabel}>Meeting Confidence</Text>
          <Text style={st.thresholdValue}>0.91</Text>
        </View>
        <View style={st.thresholdRow}>
          <Text style={st.thresholdLabel}>Home Confidence</Text>
          <Text style={st.thresholdValue}>0.95</Text>
        </View>
        <View style={[st.thresholdRow, { borderBottomWidth: 0 }]}>
          <Text style={st.thresholdLabel}>Sensor Interval</Text>
          <Text style={st.thresholdValue}>500ms</Text>
        </View>
      </View>

      {/* ── About ─────────────────────────────────────── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>ℹ️ About</Text>
        <Text style={st.aboutText}>
          Contexta v1.0 — Samsung PRISM{'\n'}
          Context-aware smartphone automation{'\n'}
          On-device processing · Zero cloud dependency
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 44, paddingHorizontal: 16 },

  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  headerSub: { fontSize: 12, color: C.textSec, marginTop: 4 },

  section: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4, letterSpacing: 0.3 },
  sectionDesc: { fontSize: 11, color: C.textSec, marginBottom: 12, lineHeight: 16 },

  inputRow: { marginBottom: 10 },
  input: { backgroundColor: C.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  btn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: C.accent },
  btnHome: { backgroundColor: C.home },
  btnAccent: { backgroundColor: '#0891B2' },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  btnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  savedBanner: { backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 8, padding: 8, marginBottom: 10 },
  savedText: { fontSize: 12, color: '#34D399', fontWeight: '600' },

  infoCard: { backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 12 },
  infoLabel: { fontSize: 10, color: C.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '700', color: C.home },

  thresholdRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  thresholdLabel: { fontSize: 13, color: C.textSec, fontWeight: '500' },
  thresholdValue: { fontSize: 13, color: C.text, fontWeight: '700' },

  aboutText: { fontSize: 12, color: C.textSec, lineHeight: 20 },
});
