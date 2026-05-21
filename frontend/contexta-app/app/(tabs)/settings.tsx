/**
 * Contexta — app/(tabs)/settings.tsx
 * ─────────────────────────────────────────────────────────────
 * ENHANCED: Live GPS session stats added.
 * All original settings (SSID, demo controls, thresholds) preserved.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  TextInput, Platform, Alert,
} from 'react-native';

import {
  getHomeSSID, setHomeSSID, setCurrentAsHome, toggleSimulatedLocation, getHomeCoordinates,
  getOfficeSSID, setOfficeSSID, setCurrentAsOffice, getOfficeCoordinates
} from '@/services/homeBridge';
import { locationEngine, type LiveContext } from '@/services/locationEngine';
import { syncHomeSettings, syncOfficeSettings } from '@/services/apiService';

// ── Design tokens — Samsung One UI Dark Theme ─────────────────
const C = {
  bg: '#000000', surface: '#121212', surfaceAlt: '#1E1E1E', border: '#2C2C2C',
  accent: '#4A90D9', home: '#4A90D9', homeActive: '#78C257',
  text: '#F0F0F0', textSec: '#8E95A9', textDim: '#4A5060',
  danger: '#FF6F61', cyan: '#5EB5F7', amber: '#F9A825',
};

export default function SettingsScreen() {
  const [homeSSID,      setHomeSSIDState] = useState(getHomeSSID());
  const [inputSSID,     setInputSSID]     = useState(homeSSID);
  const [homeCoords,    setHomeCoords]    = useState(() => getHomeCoordinates());
  const [saved,         setSaved]         = useState(false);

  const [officeSSID,    setOfficeSSIDState] = useState(getOfficeSSID());
  const [inputOfficeSSID, setInputOfficeSSID] = useState(officeSSID);
  const [officeCoords,  setOfficeCoords]    = useState(() => getOfficeCoordinates());
  const [officeSaved,   setOfficeSaved]     = useState(false);

  const [liveCtx,       setLiveCtx]       = useState<LiveContext | null>(null);

  // Subscribe to GPS engine for live session stats
  useEffect(() => {
    const unsub = locationEngine.subscribe(ctx => setLiveCtx(ctx));
    return unsub;
  }, []);

  const handleSaveSSID = useCallback(() => {
    if (inputSSID.trim()) {
      setHomeSSID(inputSSID.trim());
      setHomeSSIDState(inputSSID.trim());
      setSaved(true);

      // Sync settings with Spring Boot backend
      const coords = getHomeCoordinates();
      syncHomeSettings(inputSSID.trim(), coords.latitude, coords.longitude);

      setTimeout(() => setSaved(false), 2000);
    }
  }, [inputSSID]);

  const handleSetCurrent = useCallback(() => {
    const ssid = setCurrentAsHome(liveCtx?.latitude, liveCtx?.longitude);
    if (ssid) {
      setHomeSSIDState(ssid);
      setInputSSID(ssid);
      setHomeCoords(getHomeCoordinates());
      setSaved(true);

      // Sync settings with Spring Boot backend
      const coords = getHomeCoordinates();
      syncHomeSettings(ssid, coords.latitude, coords.longitude);

      setTimeout(() => setSaved(false), 2000);
    }
  }, [liveCtx]);

  const handleSaveOfficeSSID = useCallback(() => {
    if (inputOfficeSSID.trim()) {
      setOfficeSSID(inputOfficeSSID.trim());
      setOfficeSSIDState(inputOfficeSSID.trim());
      setOfficeSaved(true);

      // Sync settings with Spring Boot backend
      const coords = getOfficeCoordinates();
      syncOfficeSettings(inputOfficeSSID.trim(), coords.latitude, coords.longitude);

      setTimeout(() => setOfficeSaved(false), 2000);
    }
  }, [inputOfficeSSID]);

  const handleSetCurrentOffice = useCallback(() => {
    const ssid = setCurrentAsOffice(liveCtx?.latitude, liveCtx?.longitude);
    if (ssid) {
      setOfficeSSIDState(ssid);
      setInputOfficeSSID(ssid);
      setOfficeCoords(getOfficeCoordinates());
      setOfficeSaved(true);

      // Sync settings with Spring Boot backend
      const coords = getOfficeCoordinates();
      syncOfficeSettings(ssid, coords.latitude, coords.longitude);

      setTimeout(() => setOfficeSaved(false), 2000);
    }
  }, [liveCtx]);

  const handleToggleLocation = useCallback(() => {
    const isHome = toggleSimulatedLocation();
    Alert.alert('Demo Location', `Simulated location set to: ${isHome ? '🏠 HOME' : '🌍 AWAY'}`);
  }, []);

  // Session duration formatter
  const sessionDuration = liveCtx
    ? formatDuration(Date.now() - liveCtx.sessionStart)
    : '—';

  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.content} bounces={false}>

      {/* ── Header (original) ──────────────────────────────── */}
      <View style={st.header}>
        <Text style={st.headerTitle}>Settings</Text>
        <Text style={st.headerSub}>Configure your Contexta preferences</Text>
      </View>

      {/* ── NEW: Live GPS Session Stats ────────────────────── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>📡 Live GPS Session</Text>
        <Text style={st.sectionDesc}>
          Real-time telemetry from the GPS engine running in this session.
        </Text>

        <View style={st.gpsGrid}>
          <GpsStatItem
            label="Activity"
            value={liveCtx?.activity ?? 'Acquiring...'}
            color={C.homeActive}
          />
          <GpsStatItem
            label="Speed"
            value={liveCtx ? `${liveCtx.speedKmh.toFixed(1)} km/h` : '—'}
            color={C.cyan}
          />
          <GpsStatItem
            label="Distance"
            value={liveCtx?.distanceKm ?? '0 m'}
            color={C.accent}
          />
          <GpsStatItem
            label="GPS Accuracy"
            value={liveCtx ? `±${Math.round(liveCtx.accuracy)}m` : '—'}
            color={C.amber}
          />
          <GpsStatItem
            label="Readings"
            value={liveCtx ? String(liveCtx.readingCount) : '0'}
            color={C.home}
          />
          <GpsStatItem
            label="Session"
            value={sessionDuration}
            color={C.homeActive}
          />
        </View>

        {liveCtx && liveCtx.latitude !== 0 && (
          <View style={st.coordBox}>
            <Text style={st.coordLabel}>LAT: <Text style={st.coordVal}>{liveCtx.latitude.toFixed(6)}</Text></Text>
            <Text style={st.coordLabel}>LON: <Text style={st.coordVal}>{liveCtx.longitude.toFixed(6)}</Text></Text>
          </View>
        )}

        {liveCtx?.error && (
          <View style={st.errorBox}>
            <Text style={st.errorTxt}>⚠ {liveCtx.error}</Text>
          </View>
        )}

        {liveCtx && !liveCtx.permissionGranted && (
          <View style={st.errorBox}>
            <Text style={st.errorTxt}>📍 Location permission not granted. Please enable in device settings.</Text>
          </View>
        )}
      </View>

      {/* ── Home Network Configuration (original) ─────────── */}
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

        <View style={[st.infoCard, { marginTop: 10 }]}>
          <Text style={st.infoLabel}>Saved Home Coordinates</Text>
          <Text style={[st.infoValue, { color: C.cyan, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 }]}>
            LAT: {homeCoords.latitude.toFixed(6)}{'\n'}
            LON: {homeCoords.longitude.toFixed(6)}
          </Text>
        </View>
      </View>

      {/* ── Office Network Configuration ─────────────────── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>🏢 Office Network</Text>
        <Text style={st.sectionDesc}>
          Set your office WiFi SSID. Contexta will switch to Office/Work Mode when it detects this network.
        </Text>

        <View style={st.inputRow}>
          <TextInput
            style={st.input}
            value={inputOfficeSSID}
            onChangeText={setInputOfficeSSID}
            placeholder="Enter Office WiFi SSID"
            placeholderTextColor={C.textDim}
          />
        </View>

        <View style={st.btnRow}>
          <Pressable
            style={({ pressed }) => [st.btn, st.btnPrimary, pressed && st.btnPressed]}
            onPress={handleSaveOfficeSSID}
          >
            <Text style={st.btnTxt}>💾 Save SSID</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.btn, st.btnHome, pressed && st.btnPressed, { backgroundColor: C.cyan }]}
            onPress={handleSetCurrentOffice}
          >
            <Text style={st.btnTxt}>📍 Set this as Office</Text>
          </Pressable>
        </View>

        {officeSaved && (
          <View style={st.savedBanner}>
            <Text style={st.savedText}>✅ Office SSID saved: {officeSSID}</Text>
          </View>
        )}

        <View style={st.infoCard}>
          <Text style={st.infoLabel}>Current Office SSID</Text>
          <Text style={st.infoValue}>{officeSSID}</Text>
        </View>

        <View style={[st.infoCard, { marginTop: 10 }]}>
          <Text style={st.infoLabel}>Saved Office Coordinates</Text>
          <Text style={[st.infoValue, { color: C.cyan, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 }]}>
            LAT: {officeCoords.latitude.toFixed(6)}{'\n'}
            LON: {officeCoords.longitude.toFixed(6)}
          </Text>
        </View>
      </View>

      {/* ── Demo Controls (original) ──────────────────────── */}
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

      {/* ── Detection Thresholds (original + GPS thresholds) ─ */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>📊 Detection Thresholds</Text>

        <ThresholdRow label="Static Threshold"      value="< 0.5 m/s" />
        <ThresholdRow label="Walking Threshold"     value="0.5 – 2.5 m/s" />
        <ThresholdRow label="Cycling Threshold"     value="2.5 – 8.0 m/s" />
        <ThresholdRow label="Driving Threshold"     value="> 8.0 m/s" />
        <ThresholdRow label="GPS Update Interval"   value="3 000 ms" />
        <ThresholdRow label="Min Distance Delta"    value="2 m" />
        <ThresholdRow label="Movement Variance"     value="> 0.8" />
        <ThresholdRow label="Driving Variance"      value="> 3.0" />
        <ThresholdRow label="Meeting Confidence"    value="0.91" />
        <ThresholdRow label="Home Confidence"       value="0.95" isLast />
      </View>

      {/* ── Samsung PRISM One UI & Good Lock Roadmap ──────────────── */}
      <View style={[st.section, st.prismSection]}>
        <View style={st.prismHeaderRow}>
          <Text style={st.prismTitle}>📱 SAMSUNG ONE UI & GOOD LOCK ROADMAP</Text>
          <View style={st.prismBadge}>
            <Text style={st.prismBadgeTxt}>PRISM HACKATHON</Text>
          </View>
        </View>
        
        <Text style={st.sectionDesc}>
          Contexta is architected to operate as a native system integration. By hooking directly into Samsung’s specialized APIs and Good Lock hooks, we bypass standard Android overlay restrictions to deliver seamless context-aware automation.
        </Text>

        <PrismRoadmapItem 
          phase="PHASE 1" 
          title="Samsung Modes & Routines SDK" 
          desc="Direct synchronization of Contexta’s on-device MLP movement predictions and Fused GPS coordinates to Samsung's system-level Core Modes. Triggers native profiles (Power Saving, Eye Comfort Shield, custom DND) with zero latency."
          icon="🔄"
          status="API Blueprint"
          color={C.cyan}
        />

        <PrismRoadmapItem 
          phase="PHASE 2" 
          title="Good Lock (Routines+) Plugin" 
          desc="Exposing Contexta’s high-fidelity sensory consensus triggers as custom conditional macros inside Samsung's Good Lock Routines+. Allows users to orchestrate complex macros (app launches, system touches) based on deep sensor intelligence."
          icon="🔒"
          status="Arch Design"
          color={C.amber}
        />

        <PrismRoadmapItem 
          phase="PHASE 3" 
          title="One UI Sound & SoundAssistant Hook" 
          desc="Deep integration with Samsung's separate sound controller (SoundAssistant API). Enables dynamic media and notification volume scaling based on current ambient context and movement speed."
          icon="🔊"
          status="API Evaluation"
          color={C.home}
        />

        <PrismRoadmapItem 
          phase="PHASE 4" 
          title="Exynos/Snapdragon NPU Acceleration" 
          desc="Porting our custom z-score standardizing 2-layer MLP Movement Classifier to run directly on the device NPU via the Samsung Android Neural Network (SANN) SDK, lowering CPU standby overhead by up to 85%."
          icon="⚡"
          status="NPU Roadmap"
          color={C.homeActive}
        />
      </View>

      {/* ── About (original) ──────────────────────────────── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>ℹ️ About</Text>
        <Text style={st.aboutText}>
          Contexta v2.0 — Samsung PRISM{'\n'}
          Context-aware smartphone automation{'\n'}
          Real GPS Engine · On-device AI · Zero cloud dependency
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────
interface PrismItemProps {
  phase: string;
  title: string;
  desc: string;
  icon: string;
  status: string;
  color: string;
}

function PrismRoadmapItem({ phase, title, desc, icon, status, color }: PrismItemProps) {
  return (
    <View style={st.prismItem}>
      <View style={st.prismItemHeader}>
        <Text style={st.prismItemIcon}>{icon}</Text>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[st.prismItemPhase, { color }]}>{phase}</Text>
            <Text style={[st.prismItemStatus, { color, backgroundColor: color + '20' }]}>{status}</Text>
          </View>
          <Text style={st.prismItemTitle}>{title}</Text>
        </View>
      </View>
      <Text style={st.prismItemDesc}>{desc}</Text>
    </View>
  );
}

function GpsStatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={st.gpsStatItem}>
      <Text style={st.gpsStatLabel}>{label}</Text>
      <Text style={[st.gpsStatValue, { color }]}>{value}</Text>
    </View>
  );
}

function ThresholdRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[st.thresholdRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={st.thresholdLabel}>{label}</Text>
      <Text style={st.thresholdValue}>{value}</Text>
    </View>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

// ── Styles ────────────────────────────────────────────────────
const st = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: C.bg },
  content:  { paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 44, paddingHorizontal: 16 },

  header:    { marginBottom: 20 },
  headerTitle:{ fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  headerSub: { fontSize: 12, color: C.textSec, marginTop: 4 },

  section:     { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4, letterSpacing: 0.3 },
  sectionDesc: { fontSize: 11, color: C.textSec, marginBottom: 12, lineHeight: 16 },

  // GPS stats grid
  gpsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  gpsStatItem:  { flex: 1, minWidth: '30%', backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10 },
  gpsStatLabel: { fontSize: 9, color: C.textSec, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  gpsStatValue: { fontSize: 14, fontWeight: '800' },

  coordBox:   { backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10, gap: 4 },
  coordLabel: { fontSize: 11, color: C.textSec, fontWeight: '600' },
  coordVal:   { color: C.cyan, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  errorBox:   { backgroundColor: 'rgba(255,111,97,0.1)', borderRadius: 8, padding: 10, marginTop: 8 },
  errorTxt:   { fontSize: 12, color: C.danger, fontWeight: '600' },

  inputRow:  { marginBottom: 10 },
  input:     { backgroundColor: C.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: C.text, fontWeight: '600' },

  btnRow:    { flexDirection: 'row', gap: 8, marginBottom: 10 },
  btn:       { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimary:{ backgroundColor: C.accent },
  btnHome:   { backgroundColor: C.home },
  btnAccent: { backgroundColor: '#2E7CC7' },
  btnPressed:{ opacity: 0.7, transform: [{ scale: 0.97 }] },
  btnTxt:    { color: '#fff', fontSize: 12, fontWeight: '700' },

  savedBanner: { backgroundColor: 'rgba(120,194,87,0.15)', borderRadius: 8, padding: 8, marginBottom: 10 },
  savedText:   { fontSize: 12, color: '#78C257', fontWeight: '600' },

  infoCard:  { backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 12 },
  infoLabel: { fontSize: 10, color: C.textDim, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '700', color: C.home },

  thresholdRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  thresholdLabel:{ fontSize: 13, color: C.textSec, fontWeight: '500' },
  thresholdValue:{ fontSize: 13, color: C.text, fontWeight: '700' },

  aboutText: { fontSize: 12, color: C.textSec, lineHeight: 20 },

  // Samsung Prism Roadmap Styles
  prismSection: { borderColor: '#4A90D9', borderWidth: 1.5 },
  prismHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  prismTitle: { fontSize: 12, fontWeight: '800', color: '#4A90D9', letterSpacing: 0.5 },
  prismBadge: { backgroundColor: 'rgba(74, 144, 217, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(74, 144, 217, 0.3)' },
  prismBadgeTxt: { fontSize: 8, fontWeight: '800', color: '#4A90D9' },
  prismItem: { backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  prismItemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  prismItemIcon: { fontSize: 16, marginTop: 1 },
  prismItemPhase: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  prismItemStatus: { fontSize: 8, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  prismItemTitle: { fontSize: 12, fontWeight: '700', color: C.text, marginTop: 2 },
  prismItemDesc: { fontSize: 11, color: C.textSec, lineHeight: 15 },
});
