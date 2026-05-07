/**
 * Contexta — App.js (Standalone / Demo entry point)
 * ─────────────────────────────────────────────────────────────
 * REDESIGNED: Futuristic AI Dashboard — glassmorphism theme,
 * animated active states, timeline event log, responsive grid.
 *
 * Self-contained: inline mock data + all 3 context features.
 * ALL original logic preserved 100% — only UI/UX upgraded.
 *
 * Features:
 *   1. Calendar-based Meeting Detection (Day 2)
 *   2. Accelerometer Movement Detection (Day 3)
 *   3. WiFi Home Detection (Day 3)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  ActivityIndicator, Animated, Platform, Linking, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const C = {
  bg:           '#F0F4FF',
  bgHome:       '#F2FFF8',
  surface:      'rgba(255, 255, 255, 0.72)',
  surfaceAlt:   'rgba(255, 255, 255, 0.55)',
  border:       'rgba(180, 195, 255, 0.32)',
  borderHi:     'rgba(160, 180, 255, 0.45)',
  accent:       '#7C3AED',
  accentGlow:   'rgba(124, 58, 237, 0.22)',
  meeting:      '#F43F5E',
  meetingDim:   'rgba(244, 63, 94, 0.10)',
  idle:         '#10B981',
  idleDim:      'rgba(16, 185, 129, 0.10)',
  dnd:          '#F59E0B',
  dndDim:       'rgba(245, 158, 11, 0.10)',
  override:     '#3B82F6',
  inject:       '#F59E0B',
  reason:       '#475569',
  movement:     '#06B6D4',
  movementDim:  'rgba(6, 182, 212, 0.10)',
  home:         '#7C3AED',
  homeDim:      'rgba(124, 58, 237, 0.10)',
  homeActive:   '#10B981',
  homeActiveDim:'rgba(16, 185, 129, 0.08)',
  away:         '#F97316',
  awayDim:      'rgba(249, 115, 22, 0.10)',
  text:         '#0F172A',
  textSec:      '#475569',
  textDim:      '#94A3B8',
  textMuted:    '#CBD5E1',
  mono:         Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

// ═══════════════════════════════════════════════════════════════
// INLINE MOCKS  (unchanged logic)
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function logColor(context, isOverride) {
  if (isOverride) return C.override;
  if (context === 'MEETING') return C.meeting;
  if (context === 'WALKING') return C.movement;
  if (context === 'COMMUTING') return '#00D2FF';
  if (context === 'HOME') return C.homeActive;
  if (context === 'AWAY') return C.away;
  if (context === 'STATIONARY') return C.idle;
  if (context === 'ACTION') return C.inject;
  return C.textSec;
}

function logIcon(context, source) {
  if (context === 'MEETING' || source === 'Calendar') return '📅';
  if (context === 'WALKING' || source === 'Accelerometer') return '🚶';
  if (context === 'COMMUTING') return '🚗';
  if (context === 'HOME' || source === 'WiFi') return '🏠';
  if (context === 'AWAY') return '🌍';
  if (context === 'OVERRIDE') return '🔔';
  if (context === 'ACTION') return '⚡';
  return '◉';
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function PulseDot({ color, active }) {
  const ring = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 2.2, duration: 900, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    ring.setValue(1);
  }, [active]);

  return (
    <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Animated.View style={{
          position: 'absolute', width: 14, height: 14, borderRadius: 7,
          backgroundColor: color,
          opacity: ring.interpolate({ inputRange: [1, 2.2], outputRange: [0.6, 0] }),
          transform: [{ scale: ring }],
        }} />
      )}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

function GCard({ children, style, glow }) {
  return (
    <View style={[
      st.card,
      glow && {
        borderColor: glow + '55',
        ...Platform.select({
          ios: { shadowColor: glow, shadowOpacity: 0.35, shadowRadius: 18 },
          android: { elevation: 10 },
        }),
      },
      style,
    ]}>
      {children}
    </View>
  );
}

function Btn({ label, onPress, bg, fg, outline, disabled, loading }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, friction: 6 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();

  return (
    <Pressable
      onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}
      disabled={disabled || loading} style={{ flex: 1 }}
    >
      <Animated.View style={[
        st.btn,
        outline
          ? { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: (fg ?? C.border) + '50' }
          : { backgroundColor: bg ?? C.accent },
        disabled && { opacity: 0.28 },
        { transform: [{ scale }] },
      ]}>
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={[st.btnTxt, outline && fg && { color: fg }]}>{label}</Text>
        }
      </Animated.View>
    </Pressable>
  );
}

function StatusChip({ label, color }) {
  return (
    <View style={[st.sChip, { borderColor: color + '45', backgroundColor: color + '18' }]}>
      <Text style={[st.sChipTxt, { color }]}>{label}</Text>
    </View>
  );
}

function MetaPill({ label }) {
  return (
    <View style={st.metaPill}>
      <Text style={st.metaPillTxt}>{label}</Text>
    </View>
  );
}

function StatBox({ label, value, color, icon }) {
  return (
    <View style={[st.statBox, { borderColor: color + '28' }]}>
      <Text style={st.statIcon}>{icon}</Text>
      <Text style={[st.statVal, { color }]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function IntelChip({ icon, text }) {
  return (
    <View style={st.iChip}>
      <Text style={st.iChipIcon}>{icon}</Text>
      <Text style={st.iChipTxt}>{text}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const { width } = useWindowDimensions();
  const isWide = width >= 740;

  const [meetingCtx, setMeetingCtx] = useState(null);
  const [movementCtx, setMovementCtx] = useState(null);
  const [homeCtx, setHomeCtx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isHomeMode, setIsHomeMode] = useState(false);

  const logIdRef = useRef(0);
  const logoGlow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0.35, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const addLog = useCallback((ctx, action, src = 'System') => {
    logIdRef.current += 1;
    setLogs(p => [{
      id: logIdRef.current,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      context: ctx, action, source: src, isOverride: false,
    }, ...p]);
  }, []);

  // ── Meeting ──────────────────────────────────────────────
  const handleMeeting = useCallback(async () => {
    setLoading(true);
    const e = await getCalendarEvent();
    const m = e.event === 'MEETING';
    const r = {
      context: m ? 'MEETING' : 'IDLE',
      confidence: m ? 0.91 : 0.6,
      action: m ? 'DND Enabled' : 'Normal Mode',
      reason: m ? `Calendar: "${e.title}"` : 'No meeting',
      detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'Calendar',
    };
    setMeetingCtx(r);
    addLog(r.context, r.action, 'Calendar');
    setLoading(false);
  }, [addLog]);

  // ── Movement ─────────────────────────────────────────────
  const handleMovement = useCallback(() => {
    const d = getAccelerometerReading();
    const ctx = d.transportMode === 'driving' ? 'COMMUTING' : d.isMoving ? 'WALKING' : 'STATIONARY';
    const r = {
      context: ctx, isMoving: d.isMoving,
      variance: d.variance, transportMode: d.transportMode,
      confidence: 0.87,
      suggestion: d.isMoving ? 'Open Maps or Music' : 'No action',
      eta: d.isMoving ? '~25 min' : 'N/A',
      detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMovementCtx(r);
    addLog(ctx, r.suggestion, 'Accelerometer');
  }, [addLog]);

  // ── Home ─────────────────────────────────────────────────
  const handleHome = useCallback((forceHome) => {
    const d = getWiFiState(forceHome !== undefined ? forceHome : !isHomeMode);
    const r = {
      context: d.profileMode, isHome: d.isHome,
      currentSSID: d.currentSSID, homeSSID: d.homeSSID,
      confidence: 0.95,
      reason: d.isHome
        ? `SSID "${d.currentSSID}" matches home`
        : `SSID "${d.currentSSID}" ≠ home`,
      detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      wallpaper: d.isHome ? 'personal' : 'default',
      volume: d.isHome ? '60%' : 'vibrate',
    };
    setHomeCtx(r);
    setIsHomeMode(d.isHome);
    addLog(d.profileMode, `Profile → ${d.profileMode}`, 'WiFi');
  }, [isHomeMode, addLog]);

  const isDnd = meetingCtx?.action === 'DND Enabled';
  const totalActions = logs.length;

  return (
    <ScrollView
      style={[st.scroll, { backgroundColor: isHomeMode ? C.bgHome : C.bg }]}
      contentContainerStyle={st.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="dark" />

      {/* ─── HEADER ────────────────────────────────────────── */}
      <View style={st.header}>
        <View style={st.logoWrap}>
          <Animated.View style={[st.logoHalo, { opacity: logoGlow }]} />
          <Text style={st.logoGlyph}>◉</Text>
        </View>
        <Text style={st.brand}>CONTEXTA</Text>
        <Text style={st.tagline}>Context-Aware Automation · On-Device AI</Text>
        <View style={st.statusRow}>
          <StatusChip label="● LIVE" color={C.idle} />
          {isHomeMode && <StatusChip label="🏠 HOME" color={C.homeActive} />}
          {isDnd && <StatusChip label="🔕 DND" color={C.dnd} />}
          {movementCtx?.isMoving && (
            <StatusChip
              label={movementCtx.transportMode === 'driving' ? '🚗 DRIVING' : '🚶 MOVING'}
              color={C.movement}
            />
          )}
        </View>
      </View>

      {isHomeMode && (
        <View style={st.homeBanner}>
          <View style={[st.homeBannerDot, { backgroundColor: C.homeActive }]} />
          <Text style={st.homeBannerTxt}>Home Mode Active · Profile Applied</Text>
        </View>
      )}

      {/* ─── CARD GRID ─────────────────────────────────────── */}
      <View style={[st.grid, isWide && st.gridWide]}>

        {/* CARD 1: Meeting */}
        <GCard style={isWide ? st.gridCell : undefined} glow={meetingCtx?.context === 'MEETING' ? C.meeting : undefined}>
          <View style={st.cardHead}>
            <PulseDot color={meetingCtx?.context === 'MEETING' ? C.meeting : C.textMuted} active={meetingCtx?.context === 'MEETING'} />
            <Text style={st.cardTitle}>Meeting Detection</Text>
            <View style={[st.badge, { backgroundColor: isDnd ? C.dndDim : C.idleDim }]}>
              <Text style={[st.badgeTxt, { color: isDnd ? C.dnd : C.idle }]}>
                {isDnd ? '🔕 DND' : '🔔 Normal'}
              </Text>
            </View>
          </View>
          <Text style={st.cardReason}>{meetingCtx?.reason ?? 'Tap Detect to scan calendar'}</Text>
          {meetingCtx && (
            <View style={st.metaRow}>
              <MetaPill label={`${(meetingCtx.confidence * 100).toFixed(0)}% conf`} />
              <MetaPill label={meetingCtx.source} />
              <MetaPill label={meetingCtx.detectedAt} />
            </View>
          )}
          <View style={st.btnRow}>
            <Btn label="📅 Detect" onPress={handleMeeting} bg={C.accent} loading={loading} />
          </View>
        </GCard>

        {/* CARD 2: Movement */}
        <GCard style={isWide ? st.gridCell : undefined} glow={movementCtx?.isMoving ? C.movement : undefined}>
          <View style={st.cardHead}>
            <PulseDot color={movementCtx?.isMoving ? C.movement : C.textMuted} active={!!movementCtx?.isMoving} />
            <Text style={st.cardTitle}>Movement Detection</Text>
            {movementCtx?.isMoving && (
              <View style={[st.badge, { backgroundColor: C.movementDim }]}>
                <Text style={[st.badgeTxt, { color: C.movement }]}>
                  {movementCtx.transportMode === 'driving' ? '🚗' : '🚶'} {movementCtx.context}
                </Text>
              </View>
            )}
          </View>
          <Text style={st.cardReason}>
            {movementCtx
              ? movementCtx.isMoving ? `${movementCtx.context} — ${movementCtx.suggestion}` : 'Stationary'
              : 'Tap Detect to read sensor'}
          </Text>
          {movementCtx && (
            <View style={st.metaRow}>
              <MetaPill label={`Var: ${movementCtx.variance.toFixed(2)}`} />
              <MetaPill label={`${(movementCtx.confidence * 100).toFixed(0)}% conf`} />
            </View>
          )}
          {movementCtx?.isMoving && (
            <View style={st.ctaRow}>
              <Pressable style={[st.ctaBtn, { backgroundColor: '#1A73E8' }]} onPress={() => Linking.openURL('https://maps.google.com').catch(() => { })}>
                <Text style={st.ctaBtnTxt}>🗺️ Maps</Text>
              </Pressable>
              <Pressable style={[st.ctaBtn, { backgroundColor: '#1DB954' }]} onPress={() => Linking.openURL('https://open.spotify.com').catch(() => { })}>
                <Text style={st.ctaBtnTxt}>🎵 Music</Text>
              </Pressable>
            </View>
          )}
          <View style={st.btnRow}>
            <Btn label="📱 Detect" onPress={handleMovement} bg="#0891B2" />
          </View>
        </GCard>

        {/* CARD 3: Home */}
        <GCard style={isWide ? st.gridCell : undefined} glow={isHomeMode ? C.homeActive : undefined}>
          <View style={st.cardHead}>
            <PulseDot color={isHomeMode ? C.homeActive : C.away} active={isHomeMode} />
            <Text style={st.cardTitle}>Home Detection</Text>
            <View style={[st.badge, { backgroundColor: isHomeMode ? C.homeActiveDim : C.awayDim }]}>
              <Text style={[st.badgeTxt, { color: isHomeMode ? C.homeActive : C.away }]}>
                {isHomeMode ? '🏠 HOME' : '🌍 AWAY'}
              </Text>
            </View>
          </View>
          <Text style={st.cardReason}>{homeCtx?.reason ?? 'Tap Detect to check WiFi'}</Text>
          {homeCtx && (
            <View style={st.metaRow}>
              <MetaPill label={homeCtx.currentSSID} />
              <MetaPill label={`${(homeCtx.confidence * 100).toFixed(0)}% conf`} />
            </View>
          )}
          <View style={st.btnRow}>
            <Btn label="📶 Detect" onPress={() => handleHome(undefined)} bg={C.home} />
            <Btn label="🏠 Home" onPress={() => handleHome(true)} outline fg={C.homeActive} />
            <Btn label="🌍 Away" onPress={() => handleHome(false)} outline fg={C.away} />
          </View>
        </GCard>

      </View>

      {/* ─── STATS ─────────────────────────────────────────── */}
      <View style={st.statsRow}>
        <StatBox label="ACTIONS" value={String(totalActions)} color={C.accent} icon="⚡" />
        <StatBox label="HOME" value={isHomeMode ? 'ON' : 'OFF'} color={C.homeActive} icon="🏠" />
        <StatBox label="DND" value={isDnd ? 'ON' : 'OFF'} color={C.dnd} icon="🔕" />
      </View>

      {/* ─── INTEL CHIPS ───────────────────────────────────── */}
      <View style={st.intelRow}>
        <IntelChip icon="⚡" text="< 100ms" />
        <IntelChip icon="🧠" text="On-device AI" />
        <IntelChip icon="🔒" text="No cloud" />
        <IntelChip icon="📴" text="Offline ready" />
      </View>

      {/* ─── ACTIVITY LOG ──────────────────────────────────── */}
      {logs.length > 0 && (
        <GCard style={[st.logCard, { width: '100%' }]}>
          <View style={st.logHead}>
            <Text style={st.logHeadTxt}>ACTIVITY LOG</Text>
            <View style={[st.badge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <Text style={[st.badgeTxt, { color: C.textSec }]}>{logs.length} events</Text>
            </View>
          </View>

          {logs.slice(0, 10).map((entry, idx) => {
            const color = logColor(entry.context, entry.isOverride);
            return (
              <View key={entry.id} style={[st.logEntry, idx > 0 && st.logEntryBorder]}>
                <View style={[st.logBar, { backgroundColor: color }]} />
                <View style={st.logIconBox}>
                  <Text style={st.logIconTxt}>{logIcon(entry.context, entry.source)}</Text>
                </View>
                <View style={st.logBody}>
                  <View style={st.logTopRow}>
                    <Text style={[st.logCtx, { color }]}>{entry.context}</Text>
                    <Text style={st.logTime}>{entry.time}</Text>
                  </View>
                  <Text style={st.logAction} numberOfLines={1}>{entry.action}</Text>
                  <Text style={st.logSrc}>{entry.source}</Text>
                </View>
              </View>
            );
          })}
        </GCard>
      )}

      <Text style={st.footer}>On-device · No cloud · Offline</Text>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 52 : 28,
    paddingBottom: 64, paddingHorizontal: 16,
    width: '100%', maxWidth: 1100, alignSelf: 'center',
  },

  // Header
  header: { alignItems: 'center', width: '100%', marginBottom: 24 },
  logoWrap: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoHalo: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: C.accentGlow },
  logoGlyph: { fontSize: 40, color: C.accent, lineHeight: 44 },
  brand: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: 8, marginBottom: 6 },
  tagline: { fontSize: 11, color: C.textSec, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  sChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  sChipTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  homeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.30)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 11,
    marginBottom: 16, width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#10B981', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  homeBannerDot: { width: 8, height: 8, borderRadius: 4 },
  homeBannerTxt: { fontSize: 13, fontWeight: '700', color: C.homeActive },

  // Grid
  grid: { width: '100%', gap: 14, marginBottom: 16 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  gridCell: { flex: 1, minWidth: 270 },

  // Card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(200, 210, 255, 0.40)', padding: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 24 },
      android: { elevation: 6 },
    }),
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1, letterSpacing: 0.2 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  badgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  cardReason: { fontSize: 13, color: C.reason, lineHeight: 19, marginBottom: 10 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  metaPill: { backgroundColor: 'rgba(100,116,139,0.08)', borderWidth: 1, borderColor: 'rgba(100,116,139,0.18)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  metaPillTxt: { fontSize: 10, color: C.textSec, fontWeight: '600', fontFamily: C.mono },

  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  btnTxt: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },

  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ctaBtn: { flex: 1, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ctaBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(200,210,255,0.40)', paddingVertical: 18, alignItems: 'center' },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statVal: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  statLabel: { fontSize: 9, color: C.textDim, marginTop: 3, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  intelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 },
  iChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(200,210,255,0.40)', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
    ...Platform.select({ ios: { shadowColor: '#4F46E5', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 2 } }),
  },
  iChipIcon: { fontSize: 12 },
  iChipTxt: { fontSize: 11, color: C.textSec, fontWeight: '600', letterSpacing: 0.2 },

  logCard: { padding: 0, overflow: 'hidden', marginBottom: 16 },
  logHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
  logHeadTxt: { fontSize: 10, fontWeight: '900', color: C.textSec, letterSpacing: 2.5 },
  logEntry: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 16 },
  logEntryBorder: { borderTopWidth: 1, borderTopColor: 'rgba(200,210,240,0.35)' },
  logBar: { width: 3, borderRadius: 2, minHeight: 44, marginRight: 12 },
  logIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(100,116,139,0.08)', borderWidth: 1, borderColor: 'rgba(100,116,139,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logIconTxt: { fontSize: 14 },
  logBody: { flex: 1 },
  logTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  logCtx: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  logTime: { fontSize: 10, color: C.textDim, fontFamily: C.mono },
  logAction: { fontSize: 12, color: C.text, fontWeight: '600', marginBottom: 2 },
  logSrc: { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  footer: { marginTop: 8, fontSize: 10, color: C.textDim, textAlign: 'center', letterSpacing: 0.5 },
});
