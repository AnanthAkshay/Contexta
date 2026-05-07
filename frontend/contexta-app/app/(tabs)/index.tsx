/**
 * Contexta — app/(tabs)/index.tsx
 * ─────────────────────────────────────────────────────────────
 * REDESIGNED: Premium Glassmorphism Light Theme
 * Futuristic AI Dashboard — soft gradients, frosted glass cards,
 * animated active states, timeline event log, responsive grid.
 * ALL original logic preserved 100% — only UI/UX upgraded.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  ActivityIndicator, Animated, Platform, Linking, useWindowDimensions,
} from 'react-native';

import { getCalendarEvent, getInjectedMeetingEvent } from '@/services/calendarBridge';
import { determineContext, type ContextResult } from '@/services/contextDetector';
import { getAccelerometerReading, injectMovingState, injectDrivingState } from '@/services/movementBridge';
import { determineMovementContext, type MovementContextResult } from '@/services/movementDetector';
import { getWiFiState, injectHomeState, injectAwayState } from '@/services/homeBridge';
import { determineHomeContext, type HomeContextResult } from '@/services/homeDetector';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS — Premium Light Glassmorphism
// ═══════════════════════════════════════════════════════════════
const C = {
  bg:           '#EEF2FF',
  bgHome:       '#F0FFF8',
  glass:        'rgba(255, 255, 255, 0.72)',
  glassStrong:  'rgba(255, 255, 255, 0.90)',
  glassBorderLo:'rgba(200, 210, 255, 0.40)',
  glassInner:   'rgba(255, 255, 255, 0.50)',
  border:       'rgba(180, 190, 255, 0.28)',
  borderSubtle: 'rgba(200, 210, 240, 0.35)',
  cyan:         '#06B6D4',
  cyanDim:      'rgba(6, 182, 212, 0.10)',
  movementDim:  'rgba(6, 182, 212, 0.09)',
  movement:     '#06B6D4',
  movementGlow: 'rgba(6, 182, 212, 0.22)',
  blue:         '#3B82F6',
  blueGlow:     'rgba(59, 130, 246, 0.22)',
  violet:       '#7C3AED',
  violetLight:  '#A78BFA',
  violetGlow:   'rgba(124, 58, 237, 0.18)',
  violetDim:    'rgba(124, 58, 237, 0.08)',
  coral:        '#F43F5E',
  coralLight:   '#FB7185',
  coralDim:     'rgba(244, 63, 94, 0.08)',
  coralGlow:    'rgba(244, 63, 94, 0.20)',
  pink:         '#EC4899',
  pinkGlow:     'rgba(236, 72, 153, 0.18)',
  emerald:      '#10B981',
  emeraldGlow:  'rgba(16, 185, 129, 0.20)',
  emeraldDim:   'rgba(16, 185, 129, 0.09)',
  amber:        '#F59E0B',
  amberDim:     'rgba(245, 158, 11, 0.09)',
  meeting:      '#F43F5E',
  meetingDim:   'rgba(244, 63, 94, 0.09)',
  meetingGlow:  'rgba(244, 63, 94, 0.22)',
  idle:         '#10B981',
  idleDim:      'rgba(16, 185, 129, 0.09)',
  dnd:          '#F59E0B',
  dndDim:       'rgba(245, 158, 11, 0.09)',
  override:     '#3B82F6',
  home:         '#7C3AED',
  homeDim:      'rgba(124, 58, 237, 0.09)',
  homeActive:   '#10B981',
  homeActiveDim:'rgba(16, 185, 129, 0.08)',
  homeGlow:     'rgba(16, 185, 129, 0.22)',
  away:         '#F97316',
  awayDim:      'rgba(249, 115, 22, 0.09)',
  awayGlow:     'rgba(249, 115, 22, 0.20)',
  text:         '#0F172A',
  textSec:      '#475569',
  textDim:      '#94A3B8',
  textMuted:    '#CBD5E1',
  mono:         Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

interface LogEntry {
  id: number;
  time: string;
  context: string;
  action: string;
  isOverride: boolean;
  source: string;
}

function logColor(context: string, isOverride: boolean): string {
  if (isOverride)                return C.override;
  if (context === 'MEETING')     return C.meeting;
  if (context === 'WALKING')     return C.movement;
  if (context === 'COMMUTING')   return C.cyan;
  if (context === 'HOME')        return C.homeActive;
  if (context === 'AWAY')        return C.away;
  if (context === 'STATIONARY')  return C.idle;
  if (context === 'ACTION')      return C.amber;
  return C.textSec;
}

function logIcon(context: string, source: string): string {
  if (context === 'MEETING'  || source === 'Calendar')      return '📅';
  if (context === 'WALKING'  || source === 'Accelerometer') return '🚶';
  if (context === 'COMMUTING')                               return '🚗';
  if (context === 'HOME'     || source === 'WiFi')           return '🏠';
  if (context === 'AWAY')                                    return '🌍';
  if (context === 'OVERRIDE')                                return '🔔';
  if (context === 'ACTION')                                  return '⚡';
  return '◉';
}

// ─── Background blobs ────────────────────────────────────────
function BgBlobs() {
  const BLOBS = [
    { top: -60,  left: -80,  size: 260, color: 'rgba(124, 58, 237, 0.08)' },
    { top: 100,  right: -60, size: 200, color: 'rgba(6, 182, 212, 0.09)'  },
    { top: 380,  left: -40,  size: 180, color: 'rgba(236, 72, 153, 0.07)' },
    { top: 600,  right: -80, size: 240, color: 'rgba(59, 130, 246, 0.07)' },
  ];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BLOBS.map((b, i) => (
        <View key={i} style={{
          position: 'absolute',
          top: b.top,
          left: (b as any).left,
          right: (b as any).right,
          width: b.size,
          height: b.size,
          borderRadius: b.size / 2,
          backgroundColor: b.color,
        }} />
      ))} 
    </View>
  );
}

// ─── PulseDot ────────────────────────────────────────────────
function PulseDot({ color, active }: { color: string; active: boolean }) {
  const ring = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 2.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 1,   duration: 1000, useNativeDriver: true }),
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
          opacity: ring.interpolate({ inputRange: [1, 2.4], outputRange: [0.55, 0] }),
          transform: [{ scale: ring }],
        }} />
      )}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

// ─── GCard ───────────────────────────────────────────────────
function GCard({ children, style, glow, accentColor }: {
  children: React.ReactNode; style?: object; glow?: string; accentColor?: string;
}) {
  return (
    <View style={[
      st.card,
      glow && {
        borderColor: glow + '50',
        ...Platform.select({
          ios: { shadowColor: glow, shadowOpacity: 0.28, shadowRadius: 22 },
          android: { elevation: 12 },
        }),
      },
      accentColor && { borderTopWidth: 2.5, borderTopColor: accentColor },
      style,
    ]}>
      <View style={st.cardInnerGlow} pointerEvents="none" />
      {children}
    </View>
  );
}

// ─── Btn ─────────────────────────────────────────────────────
function Btn({ label, onPress, color, outline, disabled, loading, flex }: {
  label: string; onPress: () => void;
  color?: string; outline?: boolean;
  disabled?: boolean; loading?: boolean; flex?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, friction: 8 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 8 }).start();
  const c = color ?? C.blue;
  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled || loading} style={{ flex: flex ?? 1 }}>
      <Animated.View style={[
        st.btn,
        outline
          ? { backgroundColor: c + '12', borderWidth: 1.5, borderColor: c + '55' }
          : { backgroundColor: c,
              ...Platform.select({
                ios: { shadowColor: c, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.32, shadowRadius: 10 },
                android: { elevation: 5 },
              }),
            },
        disabled && { opacity: 0.30 },
        { transform: [{ scale }] },
      ]}>
        {loading
          ? <ActivityIndicator color={outline ? c : '#fff'} size="small" />
          : <Text style={[st.btnTxt, { color: outline ? c : '#fff' }]}>{label}</Text>
        }
      </Animated.View>
    </Pressable>
  );
}

// ─── StatusChip ──────────────────────────────────────────────
function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[st.sChip, {
      borderColor: color + '40',
      backgroundColor: color + '14',
      ...Platform.select({
        ios: { shadowColor: color, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
        android: { elevation: 3 },
      }),
    }]}>
      <Text style={[st.sChipTxt, { color }]}>{label}</Text>
    </View>
  );
}

// ─── MetaPill ────────────────────────────────────────────────
function MetaPill({ label }: { label: string }) {
  return (
    <View style={st.metaPill}>
      <Text style={st.metaPillTxt}>{label}</Text>
    </View>
  );
}

// ─── StatBox ─────────────────────────────────────────────────
function StatBox({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[st.statBox, {
      borderColor: color + '30',
      ...Platform.select({
        ios: { shadowColor: color, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
        android: { elevation: 4 },
      }),
    }]}>
      <View style={[st.statAccentBar, { backgroundColor: color }]} />
      <Text style={st.statIcon}>{icon}</Text>
      <Text style={[st.statVal, { color }]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

// ─── IntelChip ───────────────────────────────────────────────
function IntelChip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={st.iChip}>
      <Text style={st.iChipIcon}>{icon}</Text>
      <Text style={st.iChipTxt}>{text}</Text>
    </View>
  );
}

// ─── ProfileItem ─────────────────────────────────────────────
function ProfileItem({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={st.profileItem}>
      <Text style={st.profileIcon}>{icon}</Text>
      <Text style={st.profileVal}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 740;

  const [meetingResult,  setMeetingResult]  = useState<ContextResult | null>(null);
  const [movementResult, setMovementResult] = useState<MovementContextResult | null>(null);
  const [homeResult,     setHomeResult]     = useState<HomeContextResult | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [logs,           setLogs]           = useState<LogEntry[]>([]);
  const [isHomeMode,     setIsHomeMode]     = useState(false);

  const logIdRef = useRef(0);
  const pulse1   = useRef(new Animated.Value(1)).current;
  const pulse2   = useRef(new Animated.Value(1)).current;
  const logoRot  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse1, { toValue: 1.18, duration: 1800, useNativeDriver: true }),
      Animated.timing(pulse1, { toValue: 1,    duration: 1800, useNativeDriver: true }),
    ])).start();
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse2, { toValue: 1.32, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 1,    duration: 1800, useNativeDriver: true }),
      ])).start();
    }, 600);
    Animated.loop(
      Animated.timing(logoRot, { toValue: 1, duration: 12000, useNativeDriver: true })
    ).start();
  }, []);

  const makeLog = useCallback((context: string, action: string, isOverride = false, source = 'System'): LogEntry => {
    logIdRef.current += 1;
    return { id: logIdRef.current, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), context, action, isOverride, source };
  }, []);

  const handleDetectMeeting = useCallback(async () => {
    setLoading(true);
    try {
      const event = await getCalendarEvent();
      const ctx   = determineContext(event, 'Calendar');
      setMeetingResult(ctx);
      setLogs(p => [makeLog(ctx.context, ctx.action, false, 'Calendar'), ...p]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [makeLog]);

  const handleInjectMeeting = useCallback(() => {
    const event = getInjectedMeetingEvent();
    const ctx   = determineContext(event, 'Manual');
    setMeetingResult(ctx);
    setLogs(p => [makeLog(ctx.context, ctx.action, false, 'Manual'), ...p]);
  }, [makeLog]);

  const handleOverride = useCallback(() => {
    setMeetingResult(prev => prev ? { ...prev, action: 'Normal Mode', reason: 'User override — sound restored' } : prev);
    setLogs(p => [makeLog('OVERRIDE', 'SOUND ON', true, 'User'), ...p]);
  }, [makeLog]);

  const handleDetectMovement = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccelerometerReading();
      const ctx  = determineMovementContext(data);
      setMovementResult(ctx);
      setLogs(p => [makeLog(ctx.context, ctx.suggestion, false, 'Accelerometer'), ...p]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [makeLog]);

  const handleInjectWalking = useCallback(() => {
    const data = injectMovingState();
    const ctx  = determineMovementContext(data);
    setMovementResult(ctx);
    setLogs(p => [makeLog('WALKING', ctx.suggestion, false, 'Demo'), ...p]);
  }, [makeLog]);

  const handleInjectDriving = useCallback(() => {
    const data = injectDrivingState();
    const ctx  = determineMovementContext(data);
    setMovementResult(ctx);
    setLogs(p => [makeLog('COMMUTING', ctx.suggestion, false, 'Demo'), ...p]);
  }, [makeLog]);

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

  const handleDetectHome = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWiFiState();
      const ctx  = determineHomeContext(data);
      setHomeResult(ctx);
      setIsHomeMode(ctx.isHome);
      setLogs(p => [makeLog(ctx.context, `Profile → ${ctx.profile.mode}`, false, 'WiFi'), ...p]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [makeLog]);

  const handleInjectHome = useCallback(() => {
    const data = injectHomeState();
    const ctx  = determineHomeContext(data);
    setHomeResult(ctx);
    setIsHomeMode(true);
    setLogs(p => [makeLog('HOME', 'Profile → HOME', false, 'Demo'), ...p]);
  }, [makeLog]);

  const handleInjectAway = useCallback(() => {
    const data = injectAwayState();
    const ctx  = determineHomeContext(data);
    setHomeResult(ctx);
    setIsHomeMode(false);
    setLogs(p => [makeLog('AWAY', 'Profile → AWAY', false, 'Demo'), ...p]);
  }, [makeLog]);

  const meetingCtx     = meetingResult?.context ?? null;
  const isDnd          = meetingResult?.action === 'DND Enabled';
  const totalActions   = logs.filter(l => !l.isOverride).length;
  const totalOverrides = logs.filter(l =>  l.isOverride).length;
  const accuracy       = totalActions > 0 ? Math.min(90 + Math.floor(totalActions / 2), 97) : 0;
  const spin = logoRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <ScrollView
      style={[st.scroll, { backgroundColor: isHomeMode ? C.bgHome : C.bg }]}
      contentContainerStyle={st.container}
      bounces showsVerticalScrollIndicator={false}
    >
      <BgBlobs />

      {/* HEADER */}
      <View style={st.header}>
        <View style={st.orbWrap}>
          <Animated.View style={[st.orbRing2, { transform: [{ scale: pulse2 }] }]} />
          <Animated.View style={[st.orbRing1, { transform: [{ scale: pulse1 }] }]} />
          <Animated.View style={[st.orbSpinRing, { transform: [{ rotate: spin }] }]} />
          <View style={st.orbCore}>
            <Text style={st.orbGlyph}>◉</Text>
          </View>
        </View>
        <Text style={st.brand}>CONTEXTA</Text>
        <Text style={st.tagline}>Context-Aware Automation · On-Device AI</Text>
        <View style={st.statusRow}>
          <StatusChip label="● LIVE"   color={C.emerald} />
          {isHomeMode && <StatusChip label="🏠 HOME"  color={C.homeActive} />}
          {isDnd      && <StatusChip label="🔕 DND"   color={C.dnd} />}
          {movementResult?.isMoving && (
            <StatusChip label={movementResult.transportMode === 'driving' ? '🚗 DRIVING' : '🚶 MOVING'} color={C.movement} />
          )}
        </View>
      </View>

      {/* Home banner */}
      {isHomeMode && (
        <View style={st.homeBanner}>
          <View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.homeActive }]} />
          <Text style={[st.homeBannerTxt, { color: C.homeActive }]}>Home Mode Active · Profile Applied</Text>
        </View>
      )}

      {/* CARD GRID */}
      <View style={[st.grid, isWide && st.gridWide]}>

        {/* CARD 1: MEETING */}
        <GCard style={isWide ? st.gridCell : undefined} glow={meetingCtx === 'MEETING' ? C.meeting : undefined} accentColor={meetingCtx === 'MEETING' ? C.meeting : undefined}>
          <View style={st.cardHead}>
            <View style={[st.cardIconBadge, { backgroundColor: C.coralDim }]}>
              <Text style={st.cardIconEmoji}>📅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>Meeting Detection</Text>
              <Text style={st.cardSubtitle}>Calendar · DND Automation</Text>
            </View>
            <View style={[st.statusPill, { backgroundColor: isDnd ? C.dndDim : C.emeraldDim, borderColor: (isDnd ? C.dnd : C.emerald) + '40' }]}>
              <PulseDot color={meetingCtx === 'MEETING' ? C.meeting : C.textDim} active={meetingCtx === 'MEETING'} />
              <Text style={[st.statusPillTxt, { color: isDnd ? C.dnd : C.emerald }]}>{isDnd ? 'DND' : 'Normal'}</Text>
            </View>
          </View>
          <View style={st.cardDivider} />
          <Text style={st.cardReason}>{meetingResult?.reason ?? 'Tap Detect to scan your calendar for active events'}</Text>
          {meetingResult && (
            <View style={st.metaRow}>
              <MetaPill label={`${(meetingResult.confidence * 100).toFixed(0)}% conf`} />
              <MetaPill label={meetingResult.source} />
              <MetaPill label={meetingResult.detectedAt} />
            </View>
          )}
          <View style={st.btnRow}>
            <Btn label="📅 Detect"   onPress={handleDetectMeeting}  color={C.coral}   loading={loading} />
            <Btn label="⚡ Inject"   onPress={handleInjectMeeting}  color={C.amber} />
            <Btn label="🔔 Override" onPress={handleOverride} outline color={isDnd ? C.blue : C.textMuted} disabled={!isDnd} />
          </View>
        </GCard>

        {/* CARD 2: MOVEMENT */}
        <GCard style={isWide ? st.gridCell : undefined} glow={movementResult?.isMoving ? C.movement : undefined} accentColor={movementResult?.isMoving ? C.cyan : undefined}>
          <View style={st.cardHead}>
            <View style={[st.cardIconBadge, { backgroundColor: C.cyanDim }]}>
              <Text style={st.cardIconEmoji}>📱</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>Movement Detection</Text>
              <Text style={st.cardSubtitle}>Accelerometer · Motion Context</Text>
            </View>
            {movementResult?.isMoving && (
              <View style={[st.statusPill, { backgroundColor: C.movementDim, borderColor: C.movement + '40' }]}>
                <PulseDot color={C.movement} active />
                <Text style={[st.statusPillTxt, { color: C.movement }]}>{movementResult.transportMode === 'driving' ? 'Driving' : 'Moving'}</Text>
              </View>
            )}
          </View>
          <View style={st.cardDivider} />
          <Text style={st.cardReason}>
            {movementResult ? movementResult.isMoving ? `${movementResult.context} — ${movementResult.suggestion}` : movementResult.reason : 'Tap Detect to read accelerometer sensor data'}
          </Text>
          {movementResult && (
            <View style={st.metaRow}>
              <MetaPill label={`Var: ${movementResult.variance.toFixed(2)}`} />
              <MetaPill label={`${(movementResult.confidence * 100).toFixed(0)}% conf`} />
              <MetaPill label={`ETA: ${movementResult.eta}`} />
            </View>
          )}
          {movementResult?.isMoving && (
            <View style={st.ctaRow}>
              <Pressable style={[st.ctaBtn, { backgroundColor: '#2563EB' }]} onPress={handleOpenMaps}>
                <Text style={st.ctaBtnTxt}>🗺️ Open Maps</Text>
              </Pressable>
              <Pressable style={[st.ctaBtn, { backgroundColor: '#16A34A' }]} onPress={handleOpenMusic}>
                <Text style={st.ctaBtnTxt}>🎵 Play Music</Text>
              </Pressable>
            </View>
          )}
          <View style={st.btnRow}>
            <Btn label="📱 Detect"  onPress={handleDetectMovement} color={C.cyan}    loading={loading} />
            <Btn label="🚶 Walking" onPress={handleInjectWalking}  outline color={C.movement} />
            <Btn label="🚗 Driving" onPress={handleInjectDriving}  outline color={C.amber} />
          </View>
        </GCard>

        {/* CARD 3: HOME */}
        <GCard style={isWide ? st.gridCell : undefined} glow={isHomeMode ? C.homeActive : undefined} accentColor={isHomeMode ? C.emerald : undefined}>
          <View style={st.cardHead}>
            <View style={[st.cardIconBadge, { backgroundColor: C.violetDim }]}>
              <Text style={st.cardIconEmoji}>📶</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.cardTitle}>Home Detection</Text>
              <Text style={st.cardSubtitle}>WiFi SSID · Location Profile</Text>
            </View>
            <View style={[st.statusPill, { backgroundColor: isHomeMode ? C.homeActiveDim : C.awayDim, borderColor: (isHomeMode ? C.homeActive : C.away) + '40' }]}>
              <PulseDot color={isHomeMode ? C.homeActive : C.away} active={isHomeMode} />
              <Text style={[st.statusPillTxt, { color: isHomeMode ? C.homeActive : C.away }]}>{isHomeMode ? 'Home' : 'Away'}</Text>
            </View>
          </View>
          <View style={st.cardDivider} />
          <Text style={st.cardReason}>{homeResult?.reason ?? 'Tap Detect to check WiFi SSID and determine location'}</Text>
          {homeResult && (
            <View style={st.metaRow}>
              <MetaPill label={homeResult.currentSSID} />
              <MetaPill label={`${(homeResult.confidence * 100).toFixed(0)}% conf`} />
              <MetaPill label={homeResult.detectedAt} />
            </View>
          )}
          {homeResult && isHomeMode && (
            <View style={st.profileGrid}>
              <ProfileItem icon="🖼" value={homeResult.profile.wallpaperHint} />
              <ProfileItem icon="🔊" value={`Vol: ${homeResult.profile.volumeLevel}`} />
              <ProfileItem icon="🔔" value={homeResult.profile.notificationGrouping} />
              <ProfileItem icon="📡" value={homeResult.profile.bluetoothDevice} />
            </View>
          )}
          <View style={st.btnRow}>
            <Btn label="📶 Detect" onPress={handleDetectHome}   color={C.violet}    loading={loading} />
            <Btn label="🏠 Home"   onPress={handleInjectHome}   outline color={C.homeActive} />
            <Btn label="🌍 Away"   onPress={handleInjectAway}   outline color={C.away} />
          </View>
        </GCard>

      </View>

      {/* STATS */}
      <View style={st.statsRow}>
        <StatBox label="ACTIONS"   value={String(totalActions)}   color={C.blue}   icon="⚡" />
        <StatBox label="OVERRIDES" value={String(totalOverrides)} color={C.violet} icon="🔔" />
        <StatBox label="ACCURACY"  value={totalActions > 0 ? `${accuracy}%` : '—'} color={C.emerald} icon="🎯" />
      </View>

      {/* INTEL CHIPS */}
      <View style={st.intelRow}>
        <IntelChip icon="⚡" text="< 100ms" />
        <IntelChip icon="🧠" text="On-device AI" />
        <IntelChip icon="🔒" text="No cloud" />
        <IntelChip icon="📴" text="Offline ready" />
      </View>

      {/* ACTIVITY LOG */}
      {logs.length > 0 && (
        <GCard style={st.logCard}>
          <View style={st.logHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[st.logHeadDot, { backgroundColor: C.blue }]} />
              <Text style={st.logHeadTxt}>ACTIVITY LOG</Text>
            </View>
            <View style={[st.sChip, { borderColor: C.border, backgroundColor: C.glassInner }]}>
              <Text style={[st.sChipTxt, { color: C.textSec }]}>{logs.length} events</Text>
            </View>
          </View>
          {logs.slice(0, 12).map((entry, idx) => {
            const color = logColor(entry.context, entry.isOverride);
            return (
              <View key={entry.id} style={[st.logEntry, idx > 0 && st.logEntryBorder]}>
                <View style={[st.logBar, { backgroundColor: color }]} />
                <View style={[st.logIconBox, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                  <Text style={st.logIconTxt}>{logIcon(entry.context, entry.source)}</Text>
                </View>
                <View style={st.logBody}>
                  <View style={st.logTopRow}>
                    <Text style={[st.logCtx, { color }]}>{entry.isOverride ? 'OVERRIDE' : entry.context}</Text>
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

      <Text style={st.footer}>On-device processing · No cloud dependency · Works offline</Text>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const st = StyleSheet.create({
  scroll:    { flex: 1 },
  container: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 52 : 28,
    paddingBottom: 72, paddingHorizontal: 16,
    width: '100%', maxWidth: 1100, alignSelf: 'center',
  },

  // Header
  header: { alignItems: 'center', width: '100%', marginBottom: 24 },
  orbWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  orbRing2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(124, 58, 237, 0.07)',
    borderWidth: 1, borderColor: 'rgba(124, 58, 237, 0.15)',
  },
  orbRing1: {
    position: 'absolute', width: 78, height: 78, borderRadius: 39,
    backgroundColor: 'rgba(59, 130, 246, 0.09)',
    borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.22)',
  },
  orbSpinRing: {
    position: 'absolute', width: 68, height: 68, borderRadius: 34,
    borderWidth: 1.5, borderColor: 'transparent',
    borderTopColor: 'rgba(6, 182, 212, 0.50)',
    borderRightColor: 'rgba(124, 58, 237, 0.30)',
  },
  orbCore: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.90)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.95)',
    ...Platform.select({
      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.30, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  orbGlyph: { fontSize: 26, color: C.violet },
  brand:    { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: 8, marginBottom: 6 },
  tagline:  { fontSize: 11, color: C.textSec, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16, fontWeight: '600' },
  statusRow:{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  sChip:    { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sChipTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Home banner
  homeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1, borderColor: C.homeActive + '35',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 11,
    marginBottom: 16, width: '100%',
    ...Platform.select({
      ios: { shadowColor: C.homeActive, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  homeBannerTxt: { fontSize: 13, fontWeight: '700' },

  // Grid
  grid:     { width: '100%', gap: 14, marginBottom: 18 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  gridCell: { flex: 1, minWidth: 280 },

  // Card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(200, 210, 255, 0.40)',
    padding: 20, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 24 },
      android: { elevation: 6 },
    }),
  },
  cardInnerGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 60,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  cardHead:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIconBadge:  { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardIconEmoji:  { fontSize: 20 },
  cardTitle:      { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: 0.1 },
  cardSubtitle:   { fontSize: 11, color: C.textSec, fontWeight: '600', marginTop: 1 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusPillTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  cardDivider:    { height: 1, backgroundColor: 'rgba(200, 210, 240, 0.35)', marginBottom: 12 },
  cardReason:     { fontSize: 13, color: C.textSec, lineHeight: 20, marginBottom: 12, fontWeight: '500' },

  // Meta
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  metaPill:    { backgroundColor: 'rgba(100,116,139,0.08)', borderWidth: 1, borderColor: 'rgba(100,116,139,0.18)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  metaPillTxt: { fontSize: 10, color: C.textSec, fontWeight: '600', fontFamily: C.mono },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 8 },
  btn:    { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  btnTxt: { fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },

  // CTA
  ctaRow:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ctaBtn:    {
    flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  ctaBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Profile grid
  profileGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.28)', borderRadius: 14, padding: 12, marginBottom: 12 },
  profileItem:  { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: '45%' },
  profileIcon:  { fontSize: 12 },
  profileVal:   { fontSize: 10, color: C.textSec, fontWeight: '600' },

  // Stats
  statsRow:      { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 14 },
  statBox:       { flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 20, borderWidth: 1, paddingVertical: 18, alignItems: 'center', overflow: 'hidden', borderColor: 'rgba(200,210,255,0.40)' },
  statAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 2 },
  statIcon:      { fontSize: 18, marginBottom: 6, marginTop: 4 },
  statVal:       { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  statLabel:     { fontSize: 9, color: C.textDim, marginTop: 4, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  // Intel
  intelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 18 },
  iChip:    {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1, borderColor: 'rgba(200,210,255,0.40)',
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#4F46E5', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  iChipIcon: { fontSize: 12 },
  iChipTxt:  { fontSize: 11, color: C.textSec, fontWeight: '600', letterSpacing: 0.2 },

  // Log
  logCard:        { width: '100%', padding: 0, overflow: 'hidden', marginBottom: 18 },
  logHead:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(200,210,240,0.35)' },
  logHeadDot:     { width: 6, height: 6, borderRadius: 3 },
  logHeadTxt:     { fontSize: 10, fontWeight: '900', color: C.textSec, letterSpacing: 2.5, textTransform: 'uppercase' },
  logEntry:       { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 16 },
  logEntryBorder: { borderTopWidth: 1, borderTopColor: 'rgba(200,210,240,0.35)' },
  logBar:         { width: 3, borderRadius: 2, minHeight: 44, marginRight: 12 },
  logIconBox:     { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logIconTxt:     { fontSize: 14 },
  logBody:        { flex: 1 },
  logTopRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  logCtx:         { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  logTime:        { fontSize: 10, color: C.textDim, fontFamily: C.mono },
  logAction:      { fontSize: 12, color: C.text, fontWeight: '600', marginBottom: 2 },
  logSrc:         { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  footer: { marginTop: 8, fontSize: 10, color: C.textDim, textAlign: 'center', letterSpacing: 0.5 },
});
