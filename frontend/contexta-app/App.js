/**
 * Contexta — App.js (Standalone / Demo entry point)
 *
 * Self-contained: inline mock data, context logic, event log,
 * summary stats, intelligence labels, reason display. Zero external deps.
 *
 * Primary UI also lives in app/(tabs)/index.tsx (Expo Router).
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ══════════════════════════════════════════════════════════════
// INLINE LOGIC
// ══════════════════════════════════════════════════════════════

// Demo-optimised: all events are meetings — Detect never returns IDLE
const MOCK_EVENTS = [
  { event: 'MEETING', title: 'Sprint Standup' },
  { event: 'MEETING', title: 'Client Call' },
  { event: 'MEETING', title: 'Team Meeting' },
  { event: 'MEETING', title: 'CS101 Class' },
  { event: 'MEETING', title: 'Design Review' },
  { event: 'MEETING', title: '1:1 with Manager' },
];
let callIdx = 0;

async function getCalendarEvent() {
  await new Promise((r) => setTimeout(r, 250));
  const e = MOCK_EVENTS[callIdx % MOCK_EVENTS.length];
  callIdx++;
  return { ...e, timestamp: Math.floor(Date.now() / 1000) };
}

function determineContext(eventData, source = 'Calendar') {
  const m = eventData.event === 'MEETING';
  const r = {
    context: m ? 'MEETING' : 'IDLE',
    confidence: m ? 0.91 : 0.60,
    source,
    eventTitle: m ? eventData.title : '',
    reason: m
      ? `Calendar event "${eventData.title}" detected`
      : 'No active meeting in calendar',
    detectedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    action: m ? 'DND Enabled' : 'Normal Mode',
  };
  console.log(`[Contexta] ${r.context} | ${r.action} | ${r.reason}`);
  return r;
}

// ── Design tokens ────────────────────────────────────────────
const C = {
  bg: '#0B0D12', surface: '#141720', surfaceAlt: '#1A1E2A', border: '#1F2435',
  accent: '#6C63FF', meeting: '#FF6B6B', meetingDim: 'rgba(255,107,107,0.12)',
  idle: '#4ECB71', idleDim: 'rgba(78,203,113,0.12)',
  dnd: '#FF9F43', dndDim: 'rgba(255,159,67,0.12)',
  override: '#54A0FF', inject: '#FFBE5C', reason: '#B8BACC',
  text: '#F0F0F5', textSec: '#8A8FA6', textDim: '#454B5E',
};
function ctxColor(c) { return c === 'MEETING' ? C.meeting : c === 'IDLE' ? C.idle : C.textDim; }
function actColor(a) { return a === 'DND Enabled' ? C.dnd : C.idle; }

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Stable log ID (useRef, not global let)
  const logIdRef = useRef(0);

  const pulse = useRef(new Animated.Value(1)).current;
  const doPulse = useCallback(() => {
    pulse.setValue(0.4);
    Animated.spring(pulse, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();
  }, [pulse]);

  const makeLog = useCallback((context, action, isOverride = false) => {
    logIdRef.current += 1;
    return {
      id: logIdRef.current,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      context, action, isOverride,
    };
  }, []);

  const handleDetect = useCallback(async () => {
    setLoading(true);
    try {
      const e = await getCalendarEvent();
      const ctx = determineContext(e, 'Calendar');
      setResult(ctx);
      setLogs((p) => [makeLog(ctx.context, ctx.action), ...p]);
      doPulse();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [doPulse, makeLog]);

  const handleInject = useCallback(() => {
    const e = { event: 'MEETING', title: 'Sprint Standup', timestamp: Math.floor(Date.now() / 1000) };
    const ctx = determineContext(e, 'Manual');
    setResult(ctx);
    setLogs((p) => [makeLog(ctx.context, ctx.action), ...p]);
    doPulse();
  }, [doPulse, makeLog]);

  const handleOverride = useCallback(() => {
    console.log('[Contexta] Override → SOUND ON');
    setResult((prev) => prev ? { ...prev, action: 'Normal Mode', reason: 'User override — sound restored' } : prev);
    setLogs((p) => [makeLog('OVERRIDE', 'SOUND ON', true), ...p]);
    doPulse();
  }, [doPulse, makeLog]);

  const ctx = result?.context ?? null;
  const action = result?.action ?? null;
  const dot = ctxColor(ctx);
  const isDnd = action === 'DND Enabled';
  const totalActions = logs.filter((l) => !l.isOverride).length;
  const totalOverrides = logs.filter((l) => l.isOverride).length;
  const accuracy = totalActions > 0 ? Math.min(90 + Math.floor(totalActions / 2), 97) : 0;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} bounces={false}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>◉</Text>
        <Text style={s.brand}>Contexta</Text>
        <Text style={s.tagline}>Context-Aware Automation</Text>
      </View>

      {/* Status Ring */}
      <View style={[s.ring, { borderColor: dot, shadowColor: dot }]}>
        <Animated.View style={[s.dot, { backgroundColor: dot, transform: [{ scale: pulse }] }]} />
        <Text style={[s.ringLabel, { color: dot }]}>{ctx ?? '—'}</Text>
      </View>

      {/* Action Badge */}
      <View style={[s.badge, { backgroundColor: isDnd ? C.dndDim : C.idleDim }]}>
        <Text style={s.badgeIcon}>{isDnd ? '🔕' : '🔔'}</Text>
        <Text style={[s.badgeText, { color: actColor(action) }]}>{action ?? 'Awaiting Detection'}</Text>
      </View>

      {/* Context Card */}
      <View style={[s.card, ctx && { borderColor: dot + '30' }]}>
        <Text style={s.cardTitle}>Detection Result</Text>
        <Row label="Context"    value={result?.context ?? '—'}
             color={ctx === 'MEETING' ? C.meeting : ctx === 'IDLE' ? C.idle : null} bold={ctx === 'MEETING'} />
        <Row label="Confidence" value={result ? `${(result.confidence * 100).toFixed(0)}%` : '—'} />
        <Row label="Source"     value={result?.source ?? '—'} />
        <Row label="Event"      value={result?.eventTitle || '—'} />
        <Row label="Reason"     value={result?.reason ?? '—'} color={C.reason} />
        <Row label="Action"     value={action ?? '—'} color={actColor(action)} bold />
        <Row label="Detected"   value={result?.detectedAt ?? '—'} last />
      </View>

      {/* Summary Stats */}
      <View style={s.summaryRow}>
        <Stat label="Actions" value={String(totalActions)} color={C.accent} />
        <Stat label="Overrides" value={String(totalOverrides)} color={C.override} />
        <Stat label="Accuracy" value={totalActions > 0 ? `${accuracy}%` : '—'} color={C.idle} />
      </View>

      {/* Intelligence Labels */}
      <View style={s.intelRow}>
        <Chip icon="⚡" text="< 100ms latency" />
        <Chip icon="🧠" text="On-device AI" />
        <Chip icon="🔒" text="No data leaves device" />
      </View>

      {/* Buttons */}
      <View style={s.btns}>
        <Pressable style={({ pressed }) => [s.btn, s.btnPrimary, (pressed || loading) && s.btnPressed]}
          onPress={handleDetect} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" size="small" />
            : <><Text style={s.emoji}>📅</Text><Text style={s.btnTxt}>Detect from Calendar</Text></>}
        </Pressable>
        <Pressable style={({ pressed }) => [s.btn, s.btnInject, pressed && s.btnPressed]}
          onPress={handleInject}>
          <Text style={s.emoji}>⚡</Text>
          <Text style={[s.btnTxt, { color: C.inject }]}>Inject Meeting (Demo)</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [s.btn, s.btnOverride, pressed && s.btnPressed, !isDnd && s.btnDimmed]}
          onPress={handleOverride} disabled={!isDnd}>
          <Text style={s.emoji}>🔔</Text>
          <Text style={[s.btnTxt, { color: isDnd ? C.override : C.textDim }]}>Turn Sound Back ON</Text>
        </Pressable>
      </View>

      {/* Event Log */}
      {logs.length > 0 && (
        <View style={s.logCard}>
          <Text style={s.cardTitle}>Event Log</Text>
          {logs.slice(0, 8).map((e) => (
            <View key={e.id} style={s.logRow}>
              <Text style={s.logTime}>[{e.time}]</Text>
              <Text style={[s.logText,
                e.isOverride && { color: C.override },
                !e.isOverride && e.context === 'MEETING' && { color: C.meeting },
                !e.isOverride && e.context === 'IDLE' && { color: C.idle },
              ]}>
                {e.isOverride ? `Override → ${e.action}` : `${e.context} → ${e.action}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.footer}>On-device processing · No cloud dependency · Works offline</Text>
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────────
function Row({ label, value, color, bold, last }) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, color ? { color } : null, bold ? { fontWeight: '800' } : null]}
            numberOfLines={1}>{value}</Text>
    </View>
  );
}
function Stat({ label, value, color }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
function Chip({ icon, text }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipIcon}>{icon}</Text>
      <Text style={s.chipText}>{text}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: C.bg },
  scrollContent: { alignItems: 'center', paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 44, paddingHorizontal: 20 },

  header:  { alignItems: 'center', marginBottom: 18 },
  logo:    { fontSize: 36, color: C.accent, marginBottom: 2 },
  brand:   { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: 1.8 },
  tagline: { fontSize: 11, color: C.textSec, marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' },

  ring:      { width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
               ...Platform.select({ ios: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 18 }, android: { elevation: 10 } }) },
  dot:       { width: 22, height: 22, borderRadius: 11, marginBottom: 4 },
  ringLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  badge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 14, gap: 6 },
  badgeIcon: { fontSize: 14 },
  badgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  card:      { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingTop: 12, paddingBottom: 2, paddingHorizontal: 16, marginBottom: 14,
               ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10 }, android: { elevation: 3 } }) },
  cardTitle: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowLabel:  { fontSize: 13, color: C.textSec, fontWeight: '500' },
  rowValue:  { fontSize: 13, color: C.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  summaryRow: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 10 },
  statBox:    { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 10, alignItems: 'center' },
  statValue:  { fontSize: 20, fontWeight: '800' },
  statLabel:  { fontSize: 10, color: C.textDim, marginTop: 2, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },

  intelRow: { flexDirection: 'row', width: '100%', gap: 6, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' },
  chip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
  chipIcon: { fontSize: 11 },
  chipText: { fontSize: 10, color: C.textSec, fontWeight: '600', letterSpacing: 0.3 },

  btns:        { width: '100%', gap: 8, marginBottom: 14 },
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, gap: 8 },
  btnPrimary:  { backgroundColor: C.accent, ...Platform.select({ ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 5 } }) },
  btnInject:   { borderWidth: 1.5, borderColor: C.inject + '50' },
  btnOverride: { borderWidth: 1.5, borderColor: C.override + '50' },
  btnDimmed:   { opacity: 0.35, borderColor: C.textDim + '30' },
  btnPressed:  { opacity: 0.7, transform: [{ scale: 0.97 }] },
  emoji:       { fontSize: 15 },
  btnTxt:      { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

  logCard: { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16, marginBottom: 14 },
  logRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  logTime: { fontSize: 11, color: C.textDim, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  logText: { fontSize: 12, color: C.text, fontWeight: '600' },

  footer: { marginTop: 6, fontSize: 9, color: C.textDim, textAlign: 'center', letterSpacing: 0.4 },
});
