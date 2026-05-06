/**
 * Contexta — App.js (Standalone / Demo entry point)
 *
 * Self-contained: inline mock data, context logic for all 3 features,
 * event log, summary stats, intelligence labels, reason display.
 *
 * Features:
 *   1. Calendar-based Meeting Detection (Day 2)
 *   2. Accelerometer Movement Detection (Day 3)
 *   3. WiFi Home Detection (Day 3)
 *
 * Primary UI also lives in app/(tabs)/index.tsx (Expo Router).
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  ActivityIndicator, Animated, Platform, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ── Design tokens ────────────────────────────────────────────
const C = {
  bg: '#0B0D12', surface: '#141720', surfaceAlt: '#1A1E2A', border: '#1F2435',
  accent: '#6C63FF', meeting: '#FF6B6B', meetingDim: 'rgba(255,107,107,0.12)',
  idle: '#4ECB71', idleDim: 'rgba(78,203,113,0.12)',
  dnd: '#FF9F43', dndDim: 'rgba(255,159,67,0.12)',
  override: '#54A0FF', inject: '#FFBE5C', reason: '#B8BACC',
  movement: '#00D2FF', movementDim: 'rgba(0,210,255,0.12)',
  home: '#A78BFA', homeDim: 'rgba(167,139,250,0.12)',
  homeActive: '#34D399', homeActiveDim: 'rgba(52,211,153,0.10)',
  away: '#F97316', awayDim: 'rgba(249,115,22,0.12)',
  text: '#F0F0F5', textSec: '#8A8FA6', textDim: '#454B5E',
};

// ── Inline mocks ─────────────────────────────────────────────
const MOCK_EVENTS = [
  { event: 'MEETING', title: 'Sprint Standup' },
  { event: 'MEETING', title: 'Client Call' },
  { event: 'MEETING', title: 'Team Meeting' },
];
let callIdx = 0;

async function getCalendarEvent() {
  await new Promise(r => setTimeout(r, 250));
  const e = MOCK_EVENTS[callIdx % MOCK_EVENTS.length];
  callIdx++;
  return { ...e, timestamp: Math.floor(Date.now() / 1000) };
}

function getAccelerometerReading() {
  const variance = 0.3 + Math.random() * 2.5;
  const isMoving = variance > 0.8;
  const transportMode = variance > 3.0 ? 'driving' : variance > 0.8 ? 'walking' : 'stationary';
  return { isMoving, variance: Math.round(variance * 1000) / 1000, transportMode };
}

function getWiFiState(isHome) {
  const homeSSID = 'MyHomeWiFi';
  return {
    isHome,
    currentSSID: isHome ? homeSSID : 'OfficeWiFi_5G',
    homeSSID,
    profileMode: isHome ? 'HOME' : 'AWAY',
  };
}

// ══════════════════════════════════════════════════════════════
export default function App() {
  const [meetingCtx, setMeetingCtx] = useState(null);
  const [movementCtx, setMovementCtx] = useState(null);
  const [homeCtx, setHomeCtx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isHomeMode, setIsHomeMode] = useState(false);

  const logIdRef = useRef(0);
  const pulse = useRef(new Animated.Value(1)).current;
  const doPulse = useCallback(() => {
    pulse.setValue(0.4);
    Animated.spring(pulse, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();
  }, [pulse]);

  const addLog = useCallback((ctx, action, src = 'System') => {
    logIdRef.current += 1;
    setLogs(p => [{
      id: logIdRef.current,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      context: ctx, action, source: src,
    }, ...p]);
  }, []);

  // Meeting
  const handleMeeting = useCallback(async () => {
    setLoading(true);
    const e = await getCalendarEvent();
    const m = e.event === 'MEETING';
    const r = { context: m ? 'MEETING' : 'IDLE', confidence: m ? 0.91 : 0.6, action: m ? 'DND Enabled' : 'Normal Mode', reason: m ? `Calendar: "${e.title}"` : 'No meeting', detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), source: 'Calendar' };
    setMeetingCtx(r);
    addLog(r.context, r.action, 'Calendar');
    doPulse();
    setLoading(false);
  }, [addLog, doPulse]);

  // Movement
  const handleMovement = useCallback(() => {
    const d = getAccelerometerReading();
    const ctx = d.transportMode === 'driving' ? 'COMMUTING' : d.isMoving ? 'WALKING' : 'STATIONARY';
    const r = { context: ctx, isMoving: d.isMoving, variance: d.variance, transportMode: d.transportMode, confidence: 0.87, suggestion: d.isMoving ? 'Open Maps or Music' : 'No action', eta: d.isMoving ? '~25 min' : 'N/A', detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMovementCtx(r);
    addLog(ctx, r.suggestion, 'Accelerometer');
    doPulse();
  }, [addLog, doPulse]);

  // Home
  const handleHome = useCallback((forceHome) => {
    const d = getWiFiState(forceHome !== undefined ? forceHome : !isHomeMode);
    const r = { context: d.profileMode, isHome: d.isHome, currentSSID: d.currentSSID, homeSSID: d.homeSSID, confidence: 0.95, reason: d.isHome ? `SSID "${d.currentSSID}" matches home` : `SSID "${d.currentSSID}" ≠ home`, detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), wallpaper: d.isHome ? 'personal' : 'default', volume: d.isHome ? '60%' : 'vibrate' };
    setHomeCtx(r);
    setIsHomeMode(d.isHome);
    addLog(d.profileMode, `Profile → ${d.profileMode}`, 'WiFi');
    doPulse();
  }, [isHomeMode, addLog, doPulse]);

  const isDnd = meetingCtx?.action === 'DND Enabled';
  const totalActions = logs.length;
  const bgColor = isHomeMode ? '#0A1210' : C.bg;

  return (
    <ScrollView style={[s.scroll, { backgroundColor: bgColor }]} contentContainerStyle={s.scrollContent} bounces={false}>
      <StatusBar style="light" />

      <View style={s.header}>
        <Text style={s.logo}>◉</Text>
        <Text style={s.brand}>Contexta</Text>
        <Text style={s.tagline}>Context-Aware Automation</Text>
      </View>

      {isHomeMode && (
        <View style={s.homeBanner}>
          <Text style={{ fontSize: 16 }}>🏠</Text>
          <Text style={s.homeBannerTxt}>Home Mode Active</Text>
        </View>
      )}

      {/* Card 1: Meeting */}
      <View style={[s.card, isDnd && { borderColor: C.meeting + '40' }]}>
        <View style={s.cardHead}><View style={[s.dot, { backgroundColor: meetingCtx?.context === 'MEETING' ? C.meeting : C.idle }]} /><Text style={s.cardLabel}>Meeting Detection</Text></View>
        <Text style={s.cardReason}>{meetingCtx?.reason ?? 'Tap Detect to scan'}</Text>
        <View style={s.btnRow}>
          <Pressable style={({ pressed }) => [s.btn, { backgroundColor: C.accent }, pressed && s.pressed]} onPress={handleMeeting} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnTxt}>📅 Detect</Text>}
          </Pressable>
        </View>
      </View>

      {/* Card 2: Movement */}
      <View style={[s.card, movementCtx?.isMoving && { borderColor: C.movement + '40' }]}>
        <View style={s.cardHead}><View style={[s.dot, { backgroundColor: movementCtx?.isMoving ? C.movement : C.textDim }]} /><Text style={s.cardLabel}>Movement Detection</Text></View>
        <Text style={s.cardReason}>{movementCtx ? (movementCtx.isMoving ? `${movementCtx.context} — ${movementCtx.suggestion}` : 'Stationary') : 'Tap Detect to read sensor'}</Text>
        {movementCtx?.isMoving && (
          <View style={s.ctaRow}>
            <Pressable style={({ pressed }) => [s.cta, { backgroundColor: '#1A73E8' }, pressed && s.pressed]} onPress={() => Linking.openURL('https://maps.google.com').catch(() => {})}>
              <Text style={s.btnTxt}>🗺️ Maps</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [s.cta, { backgroundColor: '#1DB954' }, pressed && s.pressed]} onPress={() => Linking.openURL('https://open.spotify.com').catch(() => {})}>
              <Text style={s.btnTxt}>🎵 Music</Text>
            </Pressable>
          </View>
        )}
        <View style={s.btnRow}>
          <Pressable style={({ pressed }) => [s.btn, { backgroundColor: '#0891B2' }, pressed && s.pressed]} onPress={handleMovement}>
            <Text style={s.btnTxt}>📱 Detect</Text>
          </Pressable>
        </View>
      </View>

      {/* Card 3: Home */}
      <View style={[s.card, isHomeMode && { borderColor: C.homeActive + '40', backgroundColor: C.homeActiveDim }]}>
        <View style={s.cardHead}><View style={[s.dot, { backgroundColor: isHomeMode ? C.homeActive : C.away }]} /><Text style={s.cardLabel}>Home Detection</Text></View>
        <Text style={s.cardReason}>{homeCtx?.reason ?? 'Tap Detect to check WiFi'}</Text>
        <View style={s.btnRow}>
          <Pressable style={({ pressed }) => [s.btn, { backgroundColor: C.home }, pressed && s.pressed]} onPress={() => handleHome(undefined)}>
            <Text style={s.btnTxt}>📶 Detect</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [s.btn, { borderWidth: 1, borderColor: C.homeActive + '50' }, pressed && s.pressed]} onPress={() => handleHome(true)}>
            <Text style={[s.btnTxt, { color: C.homeActive }]}>🏠 Home</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [s.btn, { borderWidth: 1, borderColor: C.away + '50' }, pressed && s.pressed]} onPress={() => handleHome(false)}>
            <Text style={[s.btnTxt, { color: C.away }]}>🌍 Away</Text>
          </Pressable>
        </View>
      </View>

      {/* Intel */}
      <View style={s.intelRow}>
        <View style={s.chip}><Text style={s.chipTxt}>⚡ {'<'} 100ms</Text></View>
        <View style={s.chip}><Text style={s.chipTxt}>🧠 On-device</Text></View>
        <View style={s.chip}><Text style={s.chipTxt}>🔒 Private</Text></View>
      </View>

      {/* Log */}
      {logs.length > 0 && (
        <View style={s.logCard}>
          <Text style={s.logTitle}>Event Log</Text>
          {logs.slice(0, 10).map(e => (
            <View key={e.id} style={s.logRow}>
              <Text style={s.logTime}>[{e.time}]</Text>
              <Text style={[s.logTxt, { color: e.context === 'MEETING' ? C.meeting : e.context === 'WALKING' || e.context === 'COMMUTING' ? C.movement : e.context === 'HOME' ? C.homeActive : e.context === 'AWAY' ? C.away : C.text }]} numberOfLines={1}>
                {e.context} → {e.action}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.footer}>On-device · No cloud · Offline</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 44, paddingHorizontal: 16 },
  header: { alignItems: 'center', marginBottom: 14 },
  logo: { fontSize: 32, color: C.accent },
  brand: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: 1.8 },
  tagline: { fontSize: 10, color: C.textSec, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },
  homeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  homeBannerTxt: { fontSize: 14, fontWeight: '700', color: '#34D399' },
  card: { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  cardReason: { fontSize: 12, color: C.reason, marginBottom: 10, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 6 },
  btn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  ctaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  cta: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  intelRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { backgroundColor: C.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  chipTxt: { fontSize: 10, color: C.textSec, fontWeight: '600' },
  logCard: { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 12 },
  logTitle: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  logTime: { fontSize: 10, color: C.textDim, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  logTxt: { fontSize: 11, fontWeight: '600', flex: 1 },
  footer: { marginTop: 6, fontSize: 9, color: C.textDim, textAlign: 'center' },
});
