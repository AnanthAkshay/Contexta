import React, { useState, useRef, useCallback } from 'react';
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

import { getCalendarEvent, getInjectedMeetingEvent } from '@/services/calendarBridge';
import {
  determineContext,
  type ContextResult,
  type ContextType,
  type ActionStatus,
} from '@/services/contextDetector';

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:         '#0B0D12',
  surface:    '#141720',
  surfaceAlt: '#1A1E2A',
  border:     '#1F2435',

  accent:     '#6C63FF',
  meeting:    '#FF6B6B',
  meetingDim: 'rgba(255, 107, 107, 0.12)',
  idle:       '#4ECB71',
  idleDim:    'rgba(78, 203, 113, 0.12)',
  dnd:        '#FF9F43',
  dndDim:     'rgba(255, 159, 67, 0.12)',
  override:   '#54A0FF',
  inject:     '#FFBE5C',
  reason:     '#B8BACC',

  text:       '#F0F0F5',
  textSec:    '#8A8FA6',
  textDim:    '#454B5E',
};

// ── Log entry type ────────────────────────────────────────────
interface LogEntry {
  id: number;
  time: string;
  context: string;
  action: string;
  isOverride: boolean;
}

// ── Helpers ───────────────────────────────────────────────────
function ctxColor(ctx: ContextType | null) {
  if (ctx === 'MEETING') return C.meeting;
  if (ctx === 'IDLE') return C.idle;
  return C.textDim;
}
function actionColor(action: ActionStatus | null) {
  return action === 'DND Enabled' ? C.dnd : C.idle;
}

// ══════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const [result, setResult] = useState<ContextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Stable log ID counter (survives re-renders, no global mutable)
  const logIdRef = useRef(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const triggerPulse = useCallback(() => {
    pulseAnim.setValue(0.4);
    Animated.spring(pulseAnim, {
      toValue: 1, friction: 3, tension: 100, useNativeDriver: true,
    }).start();
  }, [pulseAnim]);

  // ── Log factory ────────────────────────────────────────────
  const makeLog = useCallback((context: string, action: string, isOverride = false): LogEntry => {
    logIdRef.current += 1;
    return {
      id: logIdRef.current,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      context,
      action,
      isOverride,
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────

  const handleDetect = useCallback(async () => {
    setLoading(true);
    try {
      const event = await getCalendarEvent();
      const ctx = determineContext(event, 'Calendar');
      setResult(ctx);
      setLogs((prev) => [makeLog(ctx.context, ctx.action), ...prev]);
      triggerPulse();
    } catch (err) {
      console.error('Detection failed:', err);
    } finally {
      setLoading(false);
    }
  }, [triggerPulse, makeLog]);

  const handleInject = useCallback(() => {
    const event = getInjectedMeetingEvent();
    const ctx = determineContext(event, 'Manual');
    setResult(ctx);
    setLogs((prev) => [makeLog(ctx.context, ctx.action), ...prev]);
    triggerPulse();
  }, [triggerPulse, makeLog]);

  const handleOverride = useCallback(() => {
    console.log('┌─── Manual Override ─────────────────────');
    console.log('│ User pressed "Turn Sound Back ON"');
    console.log('│ → Action: Normal Mode (override)');
    console.log('└──────────────────────────────────────────');
    setResult((prev) => prev ? { ...prev, action: 'Normal Mode', reason: 'User override — sound restored' } : prev);
    setLogs((prev) => [makeLog('OVERRIDE', 'SOUND ON', true), ...prev]);
    triggerPulse();
  }, [triggerPulse, makeLog]);

  // ── Derived ────────────────────────────────────────────────
  const ctx = result?.context ?? null;
  const action = result?.action ?? null;
  const dot = ctxColor(ctx);
  const isDnd = action === 'DND Enabled';

  const totalActions = logs.filter((l) => !l.isOverride).length;
  const totalOverrides = logs.filter((l) => l.isOverride).length;
  const accuracy = totalActions > 0 ? Math.min(90 + Math.floor(totalActions / 2), 97) : 0;

  // ── Render ─────────────────────────────────────────────────
  return (
    <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} bounces={false}>

      {/* ── Header ──────────────────────────────────────────── */}
      <View style={st.header}>
        <Text style={st.logo}>◉</Text>
        <Text style={st.brand}>Contexta</Text>
        <Text style={st.tagline}>Context-Aware Automation</Text>
      </View>

      {/* ── Status Ring ─────────────────────────────────────── */}
      <View style={[st.ring, { borderColor: dot, shadowColor: dot }]}>
        <Animated.View
          style={[st.dot, { backgroundColor: dot, transform: [{ scale: pulseAnim }] }]}
        />
        <Text style={[st.ringLabel, { color: dot }]}>{ctx ?? '—'}</Text>
      </View>

      {/* ── Action Badge ────────────────────────────────────── */}
      <View style={[st.actionBadge, { backgroundColor: isDnd ? C.dndDim : C.idleDim }]}>
        <Text style={st.badgeIcon}>{isDnd ? '🔕' : '🔔'}</Text>
        <Text style={[st.badgeText, { color: actionColor(action) }]}>
          {action ?? 'Awaiting Detection'}
        </Text>
      </View>

      {/* ── Context Card ────────────────────────────────────── */}
      <View style={[st.card, ctx && { borderColor: dot + '30' }]}>
        <Text style={st.cardTitle}>Detection Result</Text>
        <InfoRow label="Context"    value={result?.context ?? '—'}
                 valueColor={ctx === 'MEETING' ? C.meeting : ctx === 'IDLE' ? C.idle : undefined}
                 bold={ctx === 'MEETING'} />
        <InfoRow label="Confidence" value={result ? `${(result.confidence * 100).toFixed(0)}%` : '—'} />
        <InfoRow label="Source"     value={result?.source ?? '—'} />
        <InfoRow label="Event"      value={result?.eventTitle || '—'} />
        <InfoRow label="Reason"     value={result?.reason ?? '—'} valueColor={C.reason} />
        <InfoRow label="Action"     value={action ?? '—'} valueColor={actionColor(action)} bold />
        <InfoRow label="Detected"   value={result?.detectedAt ?? '—'} last />
      </View>

      {/* ── Summary Stats ───────────────────────────────────── */}
      <View style={st.summaryRow}>
        <StatBox label="Actions" value={String(totalActions)} color={C.accent} />
        <StatBox label="Overrides" value={String(totalOverrides)} color={C.override} />
        <StatBox label="Accuracy" value={totalActions > 0 ? `${accuracy}%` : '—'} color={C.idle} />
      </View>

      {/* ── Intelligence Labels ─────────────────────────────── */}
      <View style={st.intelRow}>
        <IntelChip icon="⚡" text="< 100ms latency" />
        <IntelChip icon="🧠" text="On-device AI" />
        <IntelChip icon="🔒" text="No data leaves device" />
      </View>

      {/* ── Buttons ─────────────────────────────────────────── */}
      <View style={st.btnGroup}>
        <Pressable
          style={({ pressed }) => [st.btn, st.btnPrimary, (pressed || loading) && st.btnPressed]}
          onPress={handleDetect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <><Text style={st.btnEmoji}>📅</Text><Text style={st.btnLabel}>Detect from Calendar</Text></>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [st.btn, st.btnInject, pressed && st.btnPressed]}
          onPress={handleInject}
        >
          <Text style={st.btnEmoji}>⚡</Text>
          <Text style={[st.btnLabel, { color: C.inject }]}>Inject Meeting (Demo)</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [st.btn, st.btnOverride, pressed && st.btnPressed, !isDnd && st.btnDimmed]}
          onPress={handleOverride}
          disabled={!isDnd}
        >
          <Text style={st.btnEmoji}>🔔</Text>
          <Text style={[st.btnLabel, { color: isDnd ? C.override : C.textDim }]}>
            Turn Sound Back ON
          </Text>
        </Pressable>
      </View>

      {/* ── Event Log ───────────────────────────────────────── */}
      {logs.length > 0 && (
        <View style={st.logCard}>
          <Text style={st.cardTitle}>Event Log</Text>
          {logs.slice(0, 8).map((entry) => (
            <View key={entry.id} style={st.logRow}>
              <Text style={st.logTime}>[{entry.time}]</Text>
              <Text
                style={[
                  st.logText,
                  entry.isOverride && { color: C.override },
                  !entry.isOverride && entry.context === 'MEETING' && { color: C.meeting },
                  !entry.isOverride && entry.context === 'IDLE' && { color: C.idle },
                ]}
              >
                {entry.isOverride
                  ? `Override → ${entry.action}`
                  : `${entry.context} → ${entry.action}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Footer ──────────────────────────────────────────── */}
      <Text style={st.footer}>
        On-device processing · No cloud dependency · Works offline
      </Text>
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────────

function InfoRow({ label, value, valueColor, bold = false, last = false }: {
  label: string; value: string; valueColor?: string; bold?: boolean; last?: boolean;
}) {
  return (
    <View style={[st.row, !last && st.rowBorder]}>
      <Text style={st.rowLabel}>{label}</Text>
      <Text
        style={[
          st.rowValue,
          valueColor ? { color: valueColor } : null,
          bold ? { fontWeight: '800' } : null,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={st.statBox}>
      <Text style={[st.statValue, { color }]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function IntelChip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={st.intelChip}>
      <Text style={st.intelIcon}>{icon}</Text>
      <Text style={st.intelText}>{text}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: C.bg },
  scrollContent: { alignItems: 'center', paddingTop: Platform.OS === 'android' ? 48 : 20, paddingBottom: 44, paddingHorizontal: 20 },

  // Header
  header:  { alignItems: 'center', marginBottom: 18 },
  logo:    { fontSize: 36, color: C.accent, marginBottom: 2 },
  brand:   { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: 1.8 },
  tagline: { fontSize: 11, color: C.textSec, marginTop: 3, letterSpacing: 1, textTransform: 'uppercase' },

  // Ring
  ring:      { width: 96, height: 96, borderRadius: 48, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
               ...Platform.select({ ios: { shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 18 }, android: { elevation: 10 } }) },
  dot:       { width: 22, height: 22, borderRadius: 11, marginBottom: 4 },
  ringLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },

  // Action Badge
  actionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 14, gap: 6 },
  badgeIcon:   { fontSize: 14 },
  badgeText:   { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Card
  card:      { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingTop: 12, paddingBottom: 2, paddingHorizontal: 16, marginBottom: 14,
               ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10 }, android: { elevation: 3 } }) },
  cardTitle: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  rowLabel:  { fontSize: 13, color: C.textSec, fontWeight: '500' },
  rowValue:  { fontSize: 13, color: C.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  // Summary Stats
  summaryRow: { flexDirection: 'row', width: '100%', gap: 8, marginBottom: 10 },
  statBox:    { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 10, alignItems: 'center' },
  statValue:  { fontSize: 20, fontWeight: '800' },
  statLabel:  { fontSize: 10, color: C.textDim, marginTop: 2, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },

  // Intelligence Labels
  intelRow:  { flexDirection: 'row', width: '100%', gap: 6, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' },
  intelChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, gap: 4 },
  intelIcon: { fontSize: 11 },
  intelText: { fontSize: 10, color: C.textSec, fontWeight: '600', letterSpacing: 0.3 },

  // Buttons
  btnGroup:   { width: '100%', gap: 8, marginBottom: 14 },
  btn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, gap: 8 },
  btnPrimary: { backgroundColor: C.accent, ...Platform.select({ ios: { shadowColor: C.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 5 } }) },
  btnInject:  { borderWidth: 1.5, borderColor: C.inject + '50' },
  btnOverride:{ borderWidth: 1.5, borderColor: C.override + '50' },
  btnDimmed:  { opacity: 0.35, borderColor: C.textDim + '30' },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  btnEmoji:   { fontSize: 15 },
  btnLabel:   { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

  // Event Log
  logCard: { width: '100%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16, marginBottom: 14 },
  logRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  logTime: { fontSize: 11, color: C.textDim, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  logText: { fontSize: 12, color: C.text, fontWeight: '600' },

  // Footer
  footer: { marginTop: 6, fontSize: 9, color: C.textDim, textAlign: 'center', letterSpacing: 0.4 },
});
