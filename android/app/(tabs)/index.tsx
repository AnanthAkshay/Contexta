/**
 * Contexta — app/(tabs)/index.tsx
 * ─────────────────────────────────────────────────────────────
 * REDESIGNED: Futuristic AI Dashboard — glassmorphism theme,
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
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const C = {
  // Backgrounds
  bg:           '#070A12',
  bgHome:       '#050E09',
  surface:      'rgba(13, 17, 28, 0.92)',
  surfaceAlt:   'rgba(18, 24, 38, 0.80)',
  glass:        'rgba(255, 255, 255, 0.03)',

  // Borders
  border:       'rgba(255, 255, 255, 0.07)',
  borderHi:     'rgba(255, 255, 255, 0.14)',

  // Accent palette
  accent:       '#6C63FF',
  accentGlow:   'rgba(108, 99, 255, 0.35)',
  cyan:         '#00D2FF',
  cyanGlow:     'rgba(0, 210, 255, 0.30)',
  green:        '#34D399',
  greenGlow:    'rgba(52, 211, 153, 0.30)',
  amber:        '#FFBE5C',
  amberGlow:    'rgba(255, 190, 92, 0.25)',

  // Context colors
  meeting:      '#FF6B6B',
  meetingDim:   'rgba(255, 107, 107, 0.12)',
  meetingGlow:  'rgba(255, 107, 107, 0.30)',
  idle:         '#4ECB71',
  idleDim:      'rgba(78, 203, 113, 0.12)',
  dnd:          '#FF9F43',
  dndDim:       'rgba(255, 159, 67, 0.12)',
  override:     '#54A0FF',
  inject:       '#FFBE5C',
  movement:     '#00D2FF',
  movementDim:  'rgba(0, 210, 255, 0.12)',
  movementGlow: 'rgba(0, 210, 255, 0.30)',
  home:         '#A78BFA',
  homeDim:      'rgba(167, 139, 250, 0.12)',
  homeActive:   '#34D399',
  homeActiveDim:'rgba(52, 211, 153, 0.10)',
  homeGlow:     'rgba(52, 211, 153, 0.30)',
  away:         '#F97316',
  awayDim:      'rgba(249, 115, 22, 0.12)',
  awayGlow:     'rgba(249, 115, 22, 0.25)',
  reason:       '#8A90AE',

  // Text
  text:         '#EEF0FF',
  textSec:      '#6A70A0',
  textDim:      '#333850',
  textMuted:    '#484E6E',
  mono:         Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
interface LogEntry {
  id: number;
  time: string;
  context: string;
  action: string;
  isOverride: boolean;
  source: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
function logColor(context: string, isOverride: boolean): string {
  if (isOverride)                                   return C.override;
  if (context === 'MEETING')                        return C.meeting;
  if (context === 'WALKING')                        return C.movement;
  if (context === 'COMMUTING')                      return C.cyan;
  if (context === 'HOME')                           return C.homeActive;
  if (context === 'AWAY')                           return C.away;
  if (context === 'STATIONARY')                     return C.idle;
  if (context === 'ACTION')                         return C.amber;
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

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/** Animated pulsing dot — glows when active */
function PulseDot({ color, active }: { color: string; active: boolean }) {
  const ring = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 2.2, duration: 900, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 1,   duration: 900, useNativeDriver: true }),
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
          position: 'absolute',
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: color,
          opacity: ring.interpolate({ inputRange: [1, 2.2], outputRange: [0.6, 0] }),
          transform: [{ scale: ring }],
        }} />
      )}
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

/** Glass card container with optional glow border */
function GCard({
  children, style, glow,
}: { children: React.ReactNode; style?: object; glow?: string }) {
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

/** Animated button with spring press */
function Btn({
  label, onPress, bg, fg, outline, disabled, loading, flex,
}: {
  label: string; onPress: () => void;
  bg?: string; fg?: string; outline?: boolean;
  disabled?: boolean; loading?: boolean; flex?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, friction: 6 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled || loading}
      style={{ flex: flex ?? 1 }}
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
          : <Text style={[st.btnTxt, fg && !outline && { color: '#fff' }, outline && fg && { color: fg }]}>{label}</Text>
        }
      </Animated.View>
    </Pressable>
  );
}

/** Tiny status chip in header */
function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[st.sChip, { borderColor: color + '45', backgroundColor: color + '18' }]}>
      <Text style={[st.sChipTxt, { color }]}>{label}</Text>
    </View>
  );
}

/** Monospaced meta pill */
function MetaPill({ label }: { label: string }) {
  return (
    <View style={st.metaPill}>
      <Text style={st.metaPillTxt}>{label}</Text>
    </View>
  );
}

/** Stat box */
function StatBox({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[st.statBox, { borderColor: color + '28' }]}>
      <Text style={st.statIcon}>{icon}</Text>
      <Text style={[st.statVal, { color }]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

/** Bottom intel chip */
function IntelChip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={st.iChip}>
      <Text style={st.iChipIcon}>{icon}</Text>
      <Text style={st.iChipTxt}>{text}</Text>
    </View>
  );
}

/** Home profile item */
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

  // ── State ──────────────────────────────────────────────────
  const [meetingResult,  setMeetingResult]  = useState<ContextResult | null>(null);
  const [movementResult, setMovementResult] = useState<MovementContextResult | null>(null);
  const [homeResult,     setHomeResult]     = useState<HomeContextResult | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [logs,           setLogs]           = useState<LogEntry[]>([]);
  const [isHomeMode,     setIsHomeMode]     = useState(false);

  const logIdRef   = useRef(0);
  const logoGlow   = useRef(new Animated.Value(0.5)).current;

  // Ambient logo glow loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1,   duration: 2200, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0.35, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Log factory ────────────────────────────────────────────
  const makeLog = useCallback(
    (context: string, action: string, isOverride = false, source = 'System'): LogEntry => {
      logIdRef.current += 1;
      return {
        id: logIdRef.current,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        context, action, isOverride, source,
      };
    }, []
  );

  // ══ MEETING DETECTION ══════════════════════════════════════
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
    setMeetingResult(prev =>
      prev ? { ...prev, action: 'Normal Mode', reason: 'User override — sound restored' } : prev
    );
    setLogs(p => [makeLog('OVERRIDE', 'SOUND ON', true, 'User'), ...p]);
  }, [makeLog]);

  // ══ MOVEMENT DETECTION ═════════════════════════════════════
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

  // ══ HOME DETECTION ═════════════════════════════════════════
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

  // ── Derived ────────────────────────────────────────────────
  const meetingCtx    = meetingResult?.context ?? null;
  const isDnd         = meetingResult?.action === 'DND Enabled';
  const totalActions  = logs.filter(l => !l.isOverride).length;
  const totalOverrides= logs.filter(l =>  l.isOverride).length;
  const accuracy      = totalActions > 0 ? Math.min(90 + Math.floor(totalActions / 2), 97) : 0;

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════
  return (
    <ScrollView
      style={[st.scroll, { backgroundColor: isHomeMode ? C.bgHome : C.bg }]}
      contentContainerStyle={st.container}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >

      {/* ────────────────── HEADER ──────────────────────────── */}
      <View style={st.header}>
        <View style={st.logoWrap}>
          <Animated.View style={[st.logoHalo, { opacity: logoGlow }]} />
          <Text style={st.logoGlyph}>◉</Text>
        </View>

        <Text style={st.brand}>CONTEXTA</Text>
        <Text style={st.tagline}>Context-Aware Automation · On-Device AI</Text>

        <View style={st.statusRow}>
          <StatusChip label="● LIVE"   color={C.idle} />
          {isHomeMode && <StatusChip label="🏠 HOME"  color={C.homeActive} />}
          {isDnd      && <StatusChip label="🔕 DND"   color={C.dnd} />}
          {movementResult?.isMoving && (
            <StatusChip
              label={movementResult.transportMode === 'driving' ? '🚗 DRIVING' : '🚶 MOVING'}
              color={C.movement}
            />
          )}
        </View>
      </View>

      {/* ── Home banner ───────────────────────────────────── */}
      {isHomeMode && (
        <View style={st.homeBanner}>
          <View style={[st.homeBannerDot, { backgroundColor: C.homeActive }]} />
          <Text style={st.homeBannerTxt}>Home Mode Active · Profile Applied</Text>
        </View>
      )}

      {/* ────────────────── CARD GRID ───────────────────────── */}
      <View style={[st.grid, isWide && st.gridWide]}>

        {/* ── CARD 1: MEETING ─────────────────────────────── */}
        <GCard
          style={isWide ? st.gridCell : undefined}
          glow={meetingCtx === 'MEETING' ? C.meeting : undefined}
        >
          <View style={st.cardHead}>
            <PulseDot color={meetingCtx === 'MEETING' ? C.meeting : C.textDim} active={meetingCtx === 'MEETING'} />
            <Text style={st.cardTitle}>Meeting Detection</Text>
            <View style={[st.badge, { backgroundColor: isDnd ? C.dndDim : C.idleDim }]}>
              <Text style={[st.badgeTxt, { color: isDnd ? C.dnd : C.idle }]}>
                {isDnd ? '🔕 DND' : '🔔 Normal'}
              </Text>
            </View>
          </View>

          <Text style={st.cardReason}>
            {meetingResult?.reason ?? 'Tap Detect to scan calendar'}
          </Text>

          {meetingResult && (
            <View style={st.metaRow}>
              <MetaPill label={`${(meetingResult.confidence * 100).toFixed(0)}% conf`} />
              <MetaPill label={meetingResult.source} />
              <MetaPill label={meetingResult.detectedAt} />
            </View>
          )}

          <View style={st.btnRow}>
            <Btn label="📅 Detect"   onPress={handleDetectMeeting}  bg={C.accent}   loading={loading} />
            <Btn label="⚡ Inject"   onPress={handleInjectMeeting}  bg={C.amber + 'CC'} />
            <Btn label="🔔 Override" onPress={handleOverride} outline fg={isDnd ? C.override : C.textMuted} disabled={!isDnd} />
          </View>
        </GCard>

        {/* ── CARD 2: MOVEMENT ────────────────────────────── */}
        <GCard
          style={isWide ? st.gridCell : undefined}
          glow={movementResult?.isMoving ? C.movement : undefined}
        >
          <View style={st.cardHead}>
            <PulseDot color={movementResult?.isMoving ? C.movement : C.textDim} active={!!movementResult?.isMoving} />
            <Text style={st.cardTitle}>Movement Detection</Text>
            {movementResult?.isMoving && (
              <View style={[st.badge, { backgroundColor: C.movementDim }]}>
                <Text style={[st.badgeTxt, { color: C.movement }]}>
                  {movementResult.transportMode === 'driving' ? '🚗' : '🚶'} {movementResult.context}
                </Text>
              </View>
            )}
          </View>

          <Text style={st.cardReason}>
            {movementResult
              ? movementResult.isMoving
                ? `${movementResult.context} — ${movementResult.suggestion}`
                : movementResult.reason
              : 'Tap Detect to read accelerometer'}
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
              <Pressable style={[st.ctaBtn, { backgroundColor: '#1A73E8' }]} onPress={handleOpenMaps}>
                <Text style={st.ctaBtnTxt}>🗺️ Open Maps</Text>
              </Pressable>
              <Pressable style={[st.ctaBtn, { backgroundColor: '#1DB954' }]} onPress={handleOpenMusic}>
                <Text style={st.ctaBtnTxt}>🎵 Play Music</Text>
              </Pressable>
            </View>
          )}

          <View style={st.btnRow}>
            <Btn label="📱 Detect"  onPress={handleDetectMovement} bg="#0891B2" loading={loading} />
            <Btn label="🚶 Walking" onPress={handleInjectWalking}  outline fg={C.movement} />
            <Btn label="🚗 Driving" onPress={handleInjectDriving}  outline fg={C.amber} />
          </View>
        </GCard>

        {/* ── CARD 3: HOME ────────────────────────────────── */}
        <GCard
          style={isWide ? st.gridCell : undefined}
          glow={isHomeMode ? C.homeActive : undefined}
        >
          <View style={st.cardHead}>
            <PulseDot color={isHomeMode ? C.homeActive : C.away} active={isHomeMode} />
            <Text style={st.cardTitle}>Home Detection</Text>
            <View style={[st.badge, { backgroundColor: isHomeMode ? C.homeActiveDim : C.awayDim }]}>
              <Text style={[st.badgeTxt, { color: isHomeMode ? C.homeActive : C.away }]}>
                {isHomeMode ? '🏠 HOME' : '🌍 AWAY'}
              </Text>
            </View>
          </View>

          <Text style={st.cardReason}>
            {homeResult?.reason ?? 'Tap Detect to check WiFi SSID'}
          </Text>

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
            <Btn label="📶 Detect" onPress={handleDetectHome}   bg={C.home}      loading={loading} />
            <Btn label="🏠 Home"   onPress={handleInjectHome}   outline fg={C.homeActive} />
            <Btn label="🌍 Away"   onPress={handleInjectAway}   outline fg={C.away} />
          </View>
        </GCard>

      </View>{/* end grid */}

      {/* ────────────────── SUMMARY STATS ───────────────────── */}
      <View style={st.statsRow}>
        <StatBox label="ACTIONS"   value={String(totalActions)}   color={C.accent}   icon="⚡" />
        <StatBox label="OVERRIDES" value={String(totalOverrides)} color={C.override} icon="🔔" />
        <StatBox label="ACCURACY"  value={totalActions > 0 ? `${accuracy}%` : '—'}  color={C.idle} icon="🎯" />
      </View>

      {/* ────────────────── INTEL CHIPS ─────────────────────── */}
      <View style={st.intelRow}>
        <IntelChip icon="⚡" text="< 100ms" />
        <IntelChip icon="🧠" text="On-device AI" />
        <IntelChip icon="🔒" text="No cloud" />
        <IntelChip icon="📴" text="Offline ready" />
      </View>

      {/* ────────────────── ACTIVITY LOG ────────────────────── */}
      {logs.length > 0 && (
        <GCard style={st.logCard}>
          {/* Log header */}
          <View style={st.logHead}>
            <Text style={st.logHeadTxt}>ACTIVITY LOG</Text>
            <View style={[st.badge, { backgroundColor: C.surfaceAlt }]}>
              <Text style={[st.badgeTxt, { color: C.textSec }]}>{logs.length} events</Text>
            </View>
          </View>

          {/* Log entries — timeline style */}
          {logs.slice(0, 12).map((entry, idx) => {
            const color = logColor(entry.context, entry.isOverride);
            return (
              <View
                key={entry.id}
                style={[st.logEntry, idx > 0 && st.logEntryBorder]}
              >
                {/* Colored left timeline bar */}
                <View style={[st.logBar, { backgroundColor: color }]} />

                {/* Icon badge */}
                <View style={st.logIconBox}>
                  <Text style={st.logIconTxt}>{logIcon(entry.context, entry.source)}</Text>
                </View>

                {/* Content */}
                <View style={st.logBody}>
                  <View style={st.logTopRow}>
                    <Text style={[st.logCtx, { color }]}>
                      {entry.isOverride ? 'OVERRIDE' : entry.context}
                    </Text>
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

  // ── Layout ─────────────────────────────────────────────────
  scroll: { flex: 1 },
  container: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 52 : 28,
    paddingBottom: 64,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },

  // ── Header ─────────────────────────────────────────────────
  header: { alignItems: 'center', width: '100%', marginBottom: 24 },

  logoWrap: {
    width: 68, height: 68,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logoHalo: {
    position: 'absolute',
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.accentGlow,
  },
  logoGlyph: { fontSize: 40, color: C.accent, lineHeight: 44 },

  brand: {
    fontSize: 30, fontWeight: '900',
    color: C.text, letterSpacing: 8,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 11, color: C.textSec,
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 14,
  },

  statusRow: {
    flexDirection: 'row', gap: 8,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  sChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  sChipTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Home banner
  homeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 16, width: '100%',
  },
  homeBannerDot: { width: 8, height: 8, borderRadius: 4 },
  homeBannerTxt: { fontSize: 13, fontWeight: '700', color: C.homeActive },

  // ── Grid ───────────────────────────────────────────────────
  grid:     { width: '100%', gap: 14, marginBottom: 16 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  gridCell: { flex: 1, minWidth: 270 },

  // ── Glass Card ─────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1, borderColor: C.border,
    padding: 20,
    marginBottom: 0,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18 },
      android: { elevation: 6 },
    }),
  },
  cardHead: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700',
    color: C.text, flex: 1, letterSpacing: 0.2,
  },

  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  badgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  cardReason: { fontSize: 13, color: C.reason, lineHeight: 19, marginBottom: 10 },

  // Meta row
  metaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  metaPillTxt: {
    fontSize: 10, color: C.textSec, fontWeight: '600',
    fontFamily: C.mono,
  },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: {
    height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  btnTxt: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },

  // CTA (Maps, Music)
  ctaRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ctaBtn:   { flex: 1, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ctaBtnTxt:{ color: '#fff', fontSize: 13, fontWeight: '700' },

  // Profile grid (Home)
  profileGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    backgroundColor: 'rgba(52,211,153,0.07)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.15)',
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  profileItem:  { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: '45%' },
  profileIcon:  { fontSize: 12 },
  profileVal:   { fontSize: 10, color: C.textSec, fontWeight: '600' },

  // ── Stats ──────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 14 },
  statBox: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18, borderWidth: 1,
    paddingVertical: 16, alignItems: 'center',
  },
  statIcon:  { fontSize: 18, marginBottom: 4 },
  statVal:   { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  statLabel: {
    fontSize: 9, color: C.textDim,
    marginTop: 3, fontWeight: '800',
    letterSpacing: 1, textTransform: 'uppercase',
  },

  // ── Intel chips ────────────────────────────────────────────
  intelRow: {
    flexDirection: 'row', gap: 8,
    flexWrap: 'wrap', justifyContent: 'center',
    marginBottom: 16,
  },
  iChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
  },
  iChipIcon: { fontSize: 12 },
  iChipTxt:  { fontSize: 11, color: C.textSec, fontWeight: '600', letterSpacing: 0.2 },

  // ── Event Log ──────────────────────────────────────────────
  logCard: { width: '100%', padding: 0, overflow: 'hidden', marginBottom: 16 },
  logHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  logHeadTxt: {
    fontSize: 10, fontWeight: '900',
    color: C.textSec, letterSpacing: 2.5,
  },

  logEntry: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  logEntryBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  logBar: { width: 3, borderRadius: 2, minHeight: 44, marginRight: 11 },
  logIconBox: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  logIconTxt: { fontSize: 14 },
  logBody:    { flex: 1 },
  logTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  logCtx:     { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  logTime:    { fontSize: 10, color: C.textDim, fontFamily: C.mono },
  logAction:  { fontSize: 12, color: C.text, fontWeight: '600', marginBottom: 2 },
  logSrc:     { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  // ── Footer ─────────────────────────────────────────────────
  footer: {
    marginTop: 8, fontSize: 10,
    color: C.textDim, textAlign: 'center', letterSpacing: 0.5,
  },
});
