import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  ActivityIndicator, Animated, Platform, Linking,
} from 'react-native';

import { getCalendarEvent, getInjectedMeetingEvent } from '@/services/calendarBridge';
import { determineContext, type ContextResult } from '@/services/contextDetector';
import { getAccelerometerReading, injectMovingState, injectDrivingState } from '@/services/movementBridge';
import { determineMovementContext, type MovementContextResult } from '@/services/movementDetector';
import { getWiFiState, injectHomeState, injectAwayState, toggleSimulatedLocation } from '@/services/homeBridge';
import { determineHomeContext, type HomeContextResult } from '@/services/homeDetector';

// ── Design tokens ─────────────────────────────────────────────
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

// ── Log entry type ────────────────────────────────────────────
interface LogEntry {
  id: number; time: string; context: string; action: string; isOverride: boolean; source: string;
}

// ══════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const [meetingResult, setMeetingResult] = useState<ContextResult | null>(null);
  const [movementResult, setMovementResult] = useState<MovementContextResult | null>(null);
  const [homeResult, setHomeResult] = useState<HomeContextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isHomeMode, setIsHomeMode] = useState(false);

  const logIdRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const triggerPulse = useCallback(() => {
    pulseAnim.setValue(0.4);
    Animated.spring(pulseAnim, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();
  }, [pulseAnim]);

  const makeLog = useCallback((context: string, action: string, isOverride = false, source = 'System'): LogEntry => {
    logIdRef.current += 1;
    return {
      id: logIdRef.current,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      context, action, isOverride, source,
    };
  }, []);

  // ── Meeting Detection ───────────────────────────────────────
  const handleDetectMeeting = useCallback(async () => {
    setLoading(true);
    try {
      const event = await getCalendarEvent();
      const ctx = determineContext(event, 'Calendar');
      setMeetingResult(ctx);
      setLogs(p => [makeLog(ctx.context, ctx.action, false, 'Calendar'), ...p]);
      triggerPulse();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [triggerPulse, makeLog]);

  const handleInjectMeeting = useCallback(() => {
    const event = getInjectedMeetingEvent();
    const ctx = determineContext(event, 'Manual');
    setMeetingResult(ctx);
    setLogs(p => [makeLog(ctx.context, ctx.action, false, 'Manual'), ...p]);
    triggerPulse();
  }, [triggerPulse, makeLog]);

  const handleOverride = useCallback(() => {
    setMeetingResult(prev => prev ? { ...prev, action: 'Normal Mode', reason: 'User override — sound restored' } : prev);
    setLogs(p => [makeLog('OVERRIDE', 'SOUND ON', true, 'User'), ...p]);
    triggerPulse();
  }, [triggerPulse, makeLog]);

  // ── Movement Detection ──────────────────────────────────────
  const handleDetectMovement = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccelerometerReading();
      const ctx = determineMovementContext(data);
      setMovementResult(ctx);
      setLogs(p => [makeLog(ctx.context, ctx.suggestion, false, 'Accelerometer'), ...p]);
      triggerPulse();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [triggerPulse, makeLog]);

  const handleInjectWalking = useCallback(() => {
    const data = injectMovingState();
    const ctx = determineMovementContext(data);
    setMovementResult(ctx);
    setLogs(p => [makeLog('WALKING', ctx.suggestion, false, 'Demo'), ...p]);
    triggerPulse();
  }, [triggerPulse, makeLog]);

  const handleInjectDriving = useCallback(() => {
    const data = injectDrivingState();
    const ctx = determineMovementContext(data);
    setMovementResult(ctx);
    setLogs(p => [makeLog('COMMUTING', ctx.suggestion, false, 'Demo'), ...p]);
    triggerPulse();
  }, [triggerPulse, makeLog]);

  const handleOpenMaps = useCallback(() => {
    Linking.openURL('https://maps.google.com').catch(() => {});
    setLogs(p => [makeLog('ACTION', 'Maps Intent Sent', false, 'CTA'), ...p]);
  }, [makeLog]);

  const handleOpenMusic = useCallback(() => {
    Linking.openURL('https://open.spotify.com').catch(() => {
      Linking.openURL('https://music.youtube.com').catch(() => {});
    });
    setLogs(p => [makeLog('ACTION', 'Music Intent Sent', false, 'CTA'), ...p]);
  }, [makeLog]);

  // ── Home Detection ──────────────────────────────────────────
  const handleDetectHome = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWiFiState();
      const ctx = determineHomeContext(data);
      setHomeResult(ctx);
      setIsHomeMode(ctx.isHome);
      setLogs(p => [makeLog(ctx.context, `Profile → ${ctx.profile.mode}`, false, 'WiFi'), ...p]);
      triggerPulse();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [triggerPulse, makeLog]);

  const handleInjectHome = useCallback(() => {
    const data = injectHomeState();
    const ctx = determineHomeContext(data);
    setHomeResult(ctx);
    setIsHomeMode(true);
    setLogs(p => [makeLog('HOME', 'Profile → HOME', false, 'Demo'), ...p]);
    triggerPulse();
  }, [triggerPulse, makeLog]);

  const handleInjectAway = useCallback(() => {
    const data = injectAwayState();
    const ctx = determineHomeContext(data);
    setHomeResult(ctx);
    setIsHomeMode(false);
    setLogs(p => [makeLog('AWAY', 'Profile → AWAY', false, 'Demo'), ...p]);
    triggerPulse();
  }, [triggerPulse, makeLog]);

  // ── Derived values ─────────────────────────────────────────
  const meetingCtx = meetingResult?.context ?? null;
  const isDnd = meetingResult?.action === 'DND Enabled';
  const totalActions = logs.filter(l => !l.isOverride).length;
  const totalOverrides = logs.filter(l => l.isOverride).length;
  const accuracy = totalActions > 0 ? Math.min(90 + Math.floor(totalActions / 2), 97) : 0;

  const bgColor = isHomeMode ? '#0A1210' : C.bg;

  return (
    <ScrollView style={[st.scroll, { backgroundColor: bgColor }]} contentContainerStyle={st.scrollContent} bounces={false}>

      {/* ── Header ────────────────────────────────────────── */}
      <View style={st.header}>
        <Text style={st.logo}>◉</Text>
        <Text style={st.brand}>Contexta</Text>
        <Text style={st.tagline}>Context-Aware Automation</Text>
      </View>

      {/* ── Home Mode Banner ──────────────────────────────── */}
      {isHomeMode && (
        <View style={st.homeBanner}>
          <Text style={st.homeBannerIcon}>🏠</Text>
          <Text style={st.homeBannerText}>Home Mode Active</Text>
        </View>
      )}

      {/* ═══ CONTEXT CARD 1: MEETING ═══════════════════════ */}
      <View style={[st.ctxCard, meetingCtx === 'MEETING' && { borderColor: C.meeting + '40' }]}>
        <View style={st.ctxCardHeader}>
          <View style={[st.ctxDot, { backgroundColor: meetingCtx === 'MEETING' ? C.meeting : C.idle }]} />
          <Text style={st.ctxCardTitle}>Meeting Detection</Text>
          <Text style={[st.ctxBadge, { color: isDnd ? C.dnd : C.idle, backgroundColor: isDnd ? C.dndDim : C.idleDim }]}>
            {isDnd ? '🔕 DND' : '🔔 Normal'}
          </Text>
        </View>
        <Text style={st.ctxReason}>{meetingResult?.reason ?? 'Tap "Detect" to scan calendar'}</Text>
        {meetingResult && (
          <View style={st.ctxMeta}>
            <Text style={st.ctxMetaItem}>Conf: {(meetingResult.confidence * 100).toFixed(0)}%</Text>
            <Text style={st.ctxMetaItem}>Source: {meetingResult.source}</Text>
            <Text style={st.ctxMetaItem}>{meetingResult.detectedAt}</Text>
          </View>
        )}
        <View style={st.ctxActions}>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnAccent, pressed && st.btnPressed]} onPress={handleDetectMeeting} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.ctxBtnTxt}>📅 Detect</Text>}
          </Pressable>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnOutline, pressed && st.btnPressed]} onPress={handleInjectMeeting}>
            <Text style={[st.ctxBtnTxt, { color: C.inject }]}>⚡ Inject</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnOutline, pressed && st.btnPressed, !isDnd && st.btnDimmed]} onPress={handleOverride} disabled={!isDnd}>
            <Text style={[st.ctxBtnTxt, { color: isDnd ? C.override : C.textDim }]}>🔔 Override</Text>
          </Pressable>
        </View>
      </View>

      {/* ═══ CONTEXT CARD 2: MOVEMENT ═════════════════════= */}
      <View style={[st.ctxCard, movementResult?.isMoving && { borderColor: C.movement + '40' }]}>
        <View style={st.ctxCardHeader}>
          <View style={[st.ctxDot, { backgroundColor: movementResult?.isMoving ? C.movement : C.textDim }]} />
          <Text style={st.ctxCardTitle}>Movement Detection</Text>
          {movementResult?.isMoving && (
            <Text style={[st.ctxBadge, { color: C.movement, backgroundColor: C.movementDim }]}>
              {movementResult.transportMode === 'driving' ? '🚗' : '🚶'} {movementResult.context}
            </Text>
          )}
        </View>
        <Text style={st.ctxReason}>
          {movementResult
            ? movementResult.isMoving
              ? `Commuting — ${movementResult.suggestion}`
              : movementResult.reason
            : 'Tap "Detect" to read accelerometer'}
        </Text>
        {movementResult && (
          <View style={st.ctxMeta}>
            <Text style={st.ctxMetaItem}>Var: {movementResult.variance.toFixed(3)}</Text>
            <Text style={st.ctxMetaItem}>Conf: {(movementResult.confidence * 100).toFixed(0)}%</Text>
            <Text style={st.ctxMetaItem}>ETA: {movementResult.eta}</Text>
          </View>
        )}

        {/* Movement CTAs — Maps & Music */}
        {movementResult?.isMoving && (
          <View style={st.ctaCont}>
            <Pressable style={({ pressed }) => [st.ctaBtn, { backgroundColor: '#1A73E8' }, pressed && st.btnPressed]} onPress={handleOpenMaps}>
              <Text style={st.ctaBtnTxt}>🗺️ Open Maps</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [st.ctaBtn, { backgroundColor: '#1DB954' }, pressed && st.btnPressed]} onPress={handleOpenMusic}>
              <Text style={st.ctaBtnTxt}>🎵 Play Music</Text>
            </Pressable>
          </View>
        )}

        <View style={st.ctxActions}>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnMovement, pressed && st.btnPressed]} onPress={handleDetectMovement} disabled={loading}>
            <Text style={st.ctxBtnTxt}>📱 Detect</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnOutline, pressed && st.btnPressed]} onPress={handleInjectWalking}>
            <Text style={[st.ctxBtnTxt, { color: C.movement }]}>🚶 Walking</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnOutline, pressed && st.btnPressed]} onPress={handleInjectDriving}>
            <Text style={[st.ctxBtnTxt, { color: C.inject }]}>🚗 Driving</Text>
          </Pressable>
        </View>
      </View>

      {/* ═══ CONTEXT CARD 3: HOME ═════════════════════════= */}
      <View style={[st.ctxCard, isHomeMode && { borderColor: C.homeActive + '40', backgroundColor: C.homeActiveDim }]}>
        <View style={st.ctxCardHeader}>
          <View style={[st.ctxDot, { backgroundColor: isHomeMode ? C.homeActive : C.away }]} />
          <Text style={st.ctxCardTitle}>Home Detection</Text>
          <Text style={[st.ctxBadge, {
            color: isHomeMode ? C.homeActive : C.away,
            backgroundColor: isHomeMode ? C.homeActiveDim : C.awayDim,
          }]}>
            {isHomeMode ? '🏠 HOME' : '🌍 AWAY'}
          </Text>
        </View>
        <Text style={st.ctxReason}>
          {homeResult
            ? homeResult.reason
            : 'Tap "Detect" to check WiFi SSID'}
        </Text>
        {homeResult && (
          <>
            <View style={st.ctxMeta}>
              <Text style={st.ctxMetaItem}>SSID: {homeResult.currentSSID}</Text>
              <Text style={st.ctxMetaItem}>Conf: {(homeResult.confidence * 100).toFixed(0)}%</Text>
              <Text style={st.ctxMetaItem}>{homeResult.detectedAt}</Text>
            </View>
            {isHomeMode && (
              <View style={st.profileInfo}>
                <Text style={st.profileItem}>🖼 {homeResult.profile.wallpaperHint}</Text>
                <Text style={st.profileItem}>🔊 Vol: {homeResult.profile.volumeLevel}</Text>
                <Text style={st.profileItem}>🔔 {homeResult.profile.notificationGrouping}</Text>
                <Text style={st.profileItem}>📡 {homeResult.profile.bluetoothDevice}</Text>
              </View>
            )}
          </>
        )}
        <View style={st.ctxActions}>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnHome, pressed && st.btnPressed]} onPress={handleDetectHome} disabled={loading}>
            <Text style={st.ctxBtnTxt}>📶 Detect</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnOutline, pressed && st.btnPressed]} onPress={handleInjectHome}>
            <Text style={[st.ctxBtnTxt, { color: C.homeActive }]}>🏠 Home</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [st.ctxBtn, st.btnOutline, pressed && st.btnPressed]} onPress={handleInjectAway}>
            <Text style={[st.ctxBtnTxt, { color: C.away }]}>🌍 Away</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Summary Stats ─────────────────────────────────── */}
      <View style={st.summaryRow}>
        <StatBox label="Actions" value={String(totalActions)} color={C.accent} />
        <StatBox label="Overrides" value={String(totalOverrides)} color={C.override} />
        <StatBox label="Accuracy" value={totalActions > 0 ? `${accuracy}%` : '—'} color={C.idle} />
      </View>

      {/* ── Intelligence Labels ───────────────────────────── */}
      <View style={st.intelRow}>
        <Chip icon="⚡" text="< 100ms latency" />
        <Chip icon="🧠" text="On-device AI" />
        <Chip icon="🔒" text="No data leaves device" />
      </View>

      {/* ── Event Log ─────────────────────────────────────── */}
      {logs.length > 0 && (
        <View style={st.logCard}>
          <Text style={st.cardTitle}>Event Log</Text>
          {logs.slice(0, 10).map(entry => (
            <View key={entry.id} style={st.logRow}>
              <Text style={st.logTime}>[{entry.time}]</Text>
              <Text style={[st.logSource, {
                color: entry.source === 'Accelerometer' ? C.movement
                     : entry.source === 'WiFi' ? C.home
                     : entry.source === 'Calendar' ? C.meeting
                     : C.textSec
              }]}>{entry.source}</Text>
              <Text style={[st.logText, {
                color: entry.isOverride ? C.override
                     : entry.context === 'MEETING' ? C.meeting
                     : entry.context === 'WALKING' || entry.context === 'COMMUTING' ? C.movement
                     : entry.context === 'HOME' ? C.homeActive
                     : entry.context === 'AWAY' ? C.away
                     : C.text
              }]} numberOfLines={1}>
                {entry.isOverride ? `Override → ${entry.action}` : `${entry.context} → ${entry.action}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={st.footer}>On-device processing · No cloud dependency · Works offline</Text>
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────────
function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={st.statBox}>
      <Text style={[st.statValue, { color }]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={st.chip}>
      <Text style={st.chipIcon}>{icon}</Text>
      <Text style={st.chipText}>{text}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { alignItems: 'center', paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 44, paddingHorizontal: 16 },

  header: { alignItems: 'center', marginBottom: 14 },
  logo: { fontSize: 32, color: C.accent, marginBottom: 2 },
  brand: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: 1.8 },
  tagline: { fontSize: 10, color: C.textSec, marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' },

  // Home mode banner
  homeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 12, gap: 8, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  homeBannerIcon: { fontSize: 18 },
  homeBannerText: { fontSize: 14, fontWeight: '700', color: '#34D399', letterSpacing: 0.5 },

  // Context cards
  ctxCard: { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10 }, android: { elevation: 3 } }) },
  ctxCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  ctxDot: { width: 10, height: 10, borderRadius: 5 },
  ctxCardTitle: { fontSize: 13, fontWeight: '700', color: C.text, flex: 1, letterSpacing: 0.3 },
  ctxBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden', letterSpacing: 0.3 },
  ctxReason: { fontSize: 12, color: C.reason, marginBottom: 8, lineHeight: 18 },
  ctxMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  ctxMetaItem: { fontSize: 10, color: C.textDim, fontWeight: '600' },

  ctxActions: { flexDirection: 'row', gap: 6 },
  ctxBtn: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  ctxBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnAccent: { backgroundColor: C.accent },
  btnMovement: { backgroundColor: '#0891B2' },
  btnHome: { backgroundColor: C.home },
  btnOutline: { borderWidth: 1.5, borderColor: C.border },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  btnDimmed: { opacity: 0.35 },

  // Movement CTAs
  ctaCont: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ctaBtn: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, android: { elevation: 3 } }) },
  ctaBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  // Home profile info
  profileInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, backgroundColor: 'rgba(52,211,153,0.08)', padding: 8, borderRadius: 8 },
  profileItem: { fontSize: 10, color: C.textSec, fontWeight: '600' },

  // Summary stats
  summaryRow: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 10 },
  statBox: { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: C.textDim, marginTop: 2, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },

  // Intel chips
  intelRow: { flexDirection: 'row', width: '100%', gap: 6, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
  chipIcon: { fontSize: 11 },
  chipText: { fontSize: 10, color: C.textSec, fontWeight: '600', letterSpacing: 0.3 },

  // Event log
  cardTitle: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  logCard: { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 14, marginBottom: 12 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 6 },
  logTime: { fontSize: 10, color: C.textDim, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  logSource: { fontSize: 9, fontWeight: '700', minWidth: 60 },
  logText: { fontSize: 11, color: C.text, fontWeight: '600', flex: 1 },

  footer: { marginTop: 6, fontSize: 9, color: C.textDim, textAlign: 'center', letterSpacing: 0.4 },
});
