/**
 * Contexta — app/(tabs)/index.tsx
 * ─────────────────────────────────────────────────────────────
 * ENHANCED: Real-time contextual intelligence dashboard.
 *
 * Changes from original:
 *  • locationEngine drives all motion data (real GPS)
 *  • Auto-refresh every 4s via useEffect interval
 *  • New GPS Stats bar (speed, distance, accuracy, coords)
 *  • New Nearby Suggestions cards panel
 *  • New AI Reasoning banner (live reason text)
 *  • Cycling activity added (was missing from original)
 *  • All original UI components, cards, animations preserved
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  ActivityIndicator, Animated, Platform, Linking,
  useWindowDimensions,
} from 'react-native';

import { locationEngine, type LiveContext, type ActivityType } from '@/services/locationEngine';
import { getCalendarEvent, getInjectedMeetingEvent } from '@/services/calendarBridge';
import { determineContext, type ContextResult } from '@/services/contextDetector';
import {
  getAccelerometerReading,
  injectMovingState, injectDrivingState, injectCyclingState,
} from '@/services/movementBridge';
import { determineMovementContext, type MovementContextResult } from '@/services/movementDetector';
import { getWiFiState, injectHomeState, injectAwayState } from '@/services/homeBridge';
import { determineHomeContext, type HomeContextResult } from '@/services/homeDetector';
import { buildSuggestionCards, type SuggestionCard } from '@/services/nearbyContext';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS  (identical to original)
// ═══════════════════════════════════════════════════════════════
const C = {
  bg:           '#070A12',
  bgHome:       '#050E09',
  surface:      'rgba(13, 17, 28, 0.92)',
  surfaceAlt:   'rgba(18, 24, 38, 0.80)',
  glass:        'rgba(255, 255, 255, 0.03)',
  border:       'rgba(255, 255, 255, 0.07)',
  borderHi:     'rgba(255, 255, 255, 0.14)',
  accent:       '#6C63FF',
  accentGlow:   'rgba(108, 99, 255, 0.35)',
  cyan:         '#00D2FF',
  cyanGlow:     'rgba(0, 210, 255, 0.30)',
  green:        '#34D399',
  greenGlow:    'rgba(52, 211, 153, 0.30)',
  amber:        '#FFBE5C',
  amberGlow:    'rgba(255, 190, 92, 0.25)',
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
  cycling:      '#A78BFA',
  cyclingDim:   'rgba(167,139,250,0.12)',
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
// HELPERS  (original preserved)
// ═══════════════════════════════════════════════════════════════
function logColor(context: string, isOverride: boolean): string {
  if (isOverride)                return C.override;
  if (context === 'MEETING')     return C.meeting;
  if (context === 'WALKING')     return C.movement;
  if (context === 'CYCLING')     return C.cycling;
  if (context === 'COMMUTING')   return C.cyan;
  if (context === 'HOME')        return C.homeActive;
  if (context === 'AWAY')        return C.away;
  if (context === 'STATIONARY')  return C.idle;
  if (context === 'ACTION')      return C.amber;
  if (context === 'GPS')         return C.green;
  return C.textSec;
}

function logIcon(context: string, source: string): string {
  if (context === 'MEETING'  || source === 'Calendar')      return '📅';
  if (context === 'WALKING'  || source === 'Accelerometer') return '🚶';
  if (context === 'CYCLING')                                 return '🚴';
  if (context === 'COMMUTING')                               return '🚗';
  if (context === 'HOME'     || source === 'WiFi')           return '🏠';
  if (context === 'AWAY')                                    return '🌍';
  if (context === 'OVERRIDE')                                return '🔔';
  if (context === 'ACTION')                                  return '⚡';
  if (context === 'GPS')                                     return '📡';
  return '◉';
}

function activityColor(activity: ActivityType | string): string {
  if (activity === 'DRIVING')  return C.cyan;
  if (activity === 'CYCLING')  return C.cycling;
  if (activity === 'WALKING')  return C.movement;
  return C.idle;
}

function activityEmoji(activity: ActivityType | string): string {
  if (activity === 'DRIVING')  return '🚗';
  if (activity === 'CYCLING')  return '🚴';
  if (activity === 'WALKING')  return '🚶';
  return '🧍';
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS  (all original, + new GPS/suggestion ones)
// ═══════════════════════════════════════════════════════════════

/** Animated pulsing dot — original */
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

/** Glass card — original */
function GCard({ children, style, glow }: { children: React.ReactNode; style?: object; glow?: string }) {
  return (
    <View style={[
      st.card,
      glow && {
        borderColor: glow + '55',
        ...Platform.select({
          ios:     { shadowColor: glow, shadowOpacity: 0.35, shadowRadius: 18 },
          android: { elevation: 10 },
        }),
      },
      style,
    ]}>
      {children}
    </View>
  );
}

/** Animated button — original */
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
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}
      disabled={disabled || loading} style={{ flex: flex ?? 1 }}>
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

/** Status chip — original */
function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[st.sChip, { borderColor: color + '45', backgroundColor: color + '18' }]}>
      <Text style={[st.sChipTxt, { color }]}>{label}</Text>
    </View>
  );
}

/** Meta pill — original */
function MetaPill({ label }: { label: string }) {
  return (
    <View style={st.metaPill}>
      <Text style={st.metaPillTxt}>{label}</Text>
    </View>
  );
}

/** Stat box — original */
function StatBox({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[st.statBox, { borderColor: color + '28' }]}>
      <Text style={st.statIcon}>{icon}</Text>
      <Text style={[st.statVal, { color }]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

/** Intel chip — original */
function IntelChip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={st.iChip}>
      <Text style={st.iChipIcon}>{icon}</Text>
      <Text style={st.iChipTxt}>{text}</Text>
    </View>
  );
}

/** Home profile item — original */
function ProfileItem({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={st.profileItem}>
      <Text style={st.profileIcon}>{icon}</Text>
      <Text style={st.profileVal}>{value}</Text>
    </View>
  );
}

// ── NEW: GPS Live Stats Bar ────────────────────────────────────
function GpsStatsBar({ ctx }: { ctx: LiveContext | null }) {
  if (!ctx) return null;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const color = activityColor(ctx.activity);

  return (
    <View style={[st.gpsBar, { borderColor: color + '30' }]}>
      {/* Live indicator */}
      <View style={st.gpsBarLeft}>
        <Animated.View style={[st.gpsDot, { backgroundColor: color, opacity: pulse }]} />
        <Text style={[st.gpsBarLabel, { color }]}>LIVE GPS</Text>
      </View>

      {/* Stats */}
      <View style={st.gpsBarStats}>
        <GpsStat icon="⚡" value={`${ctx.speedKmh.toFixed(1)}`} unit="km/h" />
        <GpsStat icon="📍" value={ctx.distanceKm} unit="" />
        <GpsStat icon="🎯" value={`±${Math.round(ctx.accuracy)}`} unit="m" />
        <GpsStat icon={activityEmoji(ctx.activity)} value={ctx.activity} unit="" color={color} />
      </View>
    </View>
  );
}

function GpsStat({ icon, value, unit, color }: { icon: string; value: string; unit: string; color?: string }) {
  return (
    <View style={st.gpsStat}>
      <Text style={st.gpsStatIcon}>{icon}</Text>
      <Text style={[st.gpsStatVal, color ? { color } : {}]}>{value}</Text>
      {unit ? <Text style={st.gpsStatUnit}>{unit}</Text> : null}
    </View>
  );
}

// ── NEW: AI Reasoning Banner ───────────────────────────────────
function ReasonBanner({ reason, confidence }: { reason: string; confidence: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    return () => fadeAnim.setValue(0);
  }, [reason]);

  const confColor =
    confidence >= 0.8  ? C.green  :
    confidence >= 0.5  ? C.amber  : C.away;

  return (
    <Animated.View style={[st.reasonBanner, { opacity: fadeAnim }]}>
      <View style={st.reasonHeader}>
        <Text style={st.reasonIcon}>🧠</Text>
        <Text style={st.reasonTitle}>AI REASONING</Text>
        <View style={[st.confBadge, { backgroundColor: confColor + '22', borderColor: confColor + '44' }]}>
          <Text style={[st.confTxt, { color: confColor }]}>{(confidence * 100).toFixed(0)}% conf</Text>
        </View>
      </View>
      <Text style={st.reasonText}>{reason}</Text>
    </Animated.View>
  );
}

// ── NEW: Nearby Suggestion Cards ──────────────────────────────
function SuggestionsPanel({ cards }: { cards: SuggestionCard[] }) {
  if (!cards.length) return null;
  return (
    <View style={st.suggestWrap}>
      <View style={st.suggestHeader}>
        <Text style={st.suggestTitle}>📍 NEARBY CONTEXT</Text>
        <Text style={st.suggestSub}>Based on current activity</Text>
      </View>
      <View style={st.suggestGrid}>
        {cards.map(card => (
          <View key={card.id} style={[st.suggestCard, { borderColor: card.color + '40' }]}>
            <View style={[st.suggestIconWrap, { backgroundColor: card.color + '20' }]}>
              <Text style={st.suggestIcon}>{card.icon}</Text>
            </View>
            <Text style={st.suggestLabel}>{card.label}</Text>
            <Text style={st.suggestCat}>{card.category}</Text>
            <Text style={[st.suggestDist, { color: card.color }]}>{card.distance}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── NEW: Coordinates Display ──────────────────────────────────
function CoordsCard({ ctx }: { ctx: LiveContext }) {
  return (
    <View style={st.coordsCard}>
      <Text style={st.coordsTitle}>📡 GPS COORDINATES</Text>
      <View style={st.coordsRow}>
        <View style={st.coordsItem}>
          <Text style={st.coordsLabel}>LAT</Text>
          <Text style={st.coordsVal}>{ctx.latitude.toFixed(6)}</Text>
        </View>
        <View style={st.coordsSep} />
        <View style={st.coordsItem}>
          <Text style={st.coordsLabel}>LON</Text>
          <Text style={st.coordsVal}>{ctx.longitude.toFixed(6)}</Text>
        </View>
        {ctx.altitude !== null && (
          <>
            <View style={st.coordsSep} />
            <View style={st.coordsItem}>
              <Text style={st.coordsLabel}>ALT</Text>
              <Text style={st.coordsVal}>{ctx.altitude.toFixed(1)}m</Text>
            </View>
          </>
        )}
      </View>
      <Text style={st.coordsUpdated}>Updated {ctx.lastUpdated} · {ctx.readingCount} readings</Text>
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
  const [liveCtx,        setLiveCtx]        = useState<LiveContext | null>(null);
  const [suggestions,    setSuggestions]    = useState<SuggestionCard[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [gpsStarted,     setGpsStarted]     = useState(false);
  const [logs,           setLogs]           = useState<LogEntry[]>([]);
  const [isHomeMode,     setIsHomeMode]     = useState(false);

  const logIdRef = useRef(0);
  const logoGlow = useRef(new Animated.Value(0.5)).current;
  const prevActivity = useRef<string>('');

  // ── Ambient logo glow loop (original) ──────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1,    duration: 2200, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0.35, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── Start GPS engine on mount ──────────────────────────────
  useEffect(() => {
    locationEngine.start().then(() => setGpsStarted(true));

    const unsub = locationEngine.subscribe((ctx) => {
      setLiveCtx(ctx);

      // Update suggestion cards
      setSuggestions(buildSuggestionCards(ctx.activity, ctx.distanceM));

      // Auto-sync movement card from GPS (no button needed)
      const data = {
        isMoving:      ctx.isMoving,
        variance:      ctx.isMoving ? 1.5 : 0.1,
        transportMode: ctx.activity === 'DRIVING' ? 'driving'
                     : ctx.activity === 'CYCLING' ? 'cycling'
                     : ctx.activity === 'WALKING' ? 'walking'
                     : 'stationary',
        speedMs:       ctx.speed,
        speedKmh:      ctx.speedKmh,
        distanceM:     ctx.distanceM,
        activity:      ctx.activity,
        latitude:      ctx.latitude,
        longitude:     ctx.longitude,
        accuracy:      ctx.accuracy,
        reason:        ctx.reason,
        confidence:    ctx.confidence,
      };
      const mCtx = determineMovementContext(data);
      setMovementResult(mCtx);

      // Log activity changes (avoid duplicate logs)
      if (ctx.activity !== prevActivity.current) {
        prevActivity.current = ctx.activity;
        logIdRef.current += 1;
        setLogs(p => [{
          id:         logIdRef.current,
          time:       ctx.lastUpdated,
          context:    ctx.activity,
          action:     ctx.reason,
          isOverride: false,
          source:     'GPS',
        }, ...p.slice(0, 19)]);
      }
    });

    return () => {
      unsub();
      locationEngine.stop();
    };
  }, []);

  // ── Log factory (original) ─────────────────────────────────
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

  // ══ MEETING DETECTION (original) ═══════════════════════════
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

  // ══ MOVEMENT DETECTION (enhanced with GPS + original demos) ═
  const handleDetectMovement = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccelerometerReading();
      const ctx  = determineMovementContext(data);
      setMovementResult(ctx);
      setLogs(p => [makeLog(ctx.context, ctx.suggestion, false, 'GPS+Sensor'), ...p]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [makeLog]);

  const handleInjectWalking = useCallback(() => {
    const data = injectMovingState();
    const ctx  = determineMovementContext(data);
    setMovementResult(ctx);
    setSuggestions(buildSuggestionCards('WALKING', 120));
    setLogs(p => [makeLog('WALKING', ctx.suggestion, false, 'Demo'), ...p]);
  }, [makeLog]);

  const handleInjectDriving = useCallback(() => {
    const data = injectDrivingState();
    const ctx  = determineMovementContext(data);
    setMovementResult(ctx);
    setSuggestions(buildSuggestionCards('DRIVING', 2800));
    setLogs(p => [makeLog('COMMUTING', ctx.suggestion, false, 'Demo'), ...p]);
  }, [makeLog]);

  const handleInjectCycling = useCallback(() => {
    const data = injectCyclingState();
    const ctx  = determineMovementContext(data);
    setMovementResult(ctx);
    setSuggestions(buildSuggestionCards('CYCLING', 800));
    setLogs(p => [makeLog('CYCLING', ctx.suggestion, false, 'Demo'), ...p]);
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

  // ══ HOME DETECTION (original) ══════════════════════════════
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
  const meetingCtx     = meetingResult?.context ?? null;
  const isDnd          = meetingResult?.action === 'DND Enabled';
  const totalActions   = logs.filter(l => !l.isOverride).length;
  const totalOverrides = logs.filter(l =>  l.isOverride).length;
  const accuracy       = totalActions > 0 ? Math.min(90 + Math.floor(totalActions / 2), 97) : 0;

  const liveActivity   = liveCtx?.activity ?? 'STATIC';
  const actColor       = activityColor(liveActivity);
  const isMovingLive   = liveCtx?.isMoving ?? false;

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

      {/* ─────────────────── HEADER (original) ─────────────── */}
      <View style={st.header}>
        <View style={st.logoWrap}>
          <Animated.View style={[st.logoHalo, { opacity: logoGlow }]} />
          <Text style={st.logoGlyph}>◉</Text>
        </View>
        <Text style={st.brand}>CONTEXTA</Text>
        <Text style={st.tagline}>Context-Aware Automation · On-Device AI</Text>

        <View style={st.statusRow}>
          <StatusChip label="● LIVE" color={C.idle} />
          {gpsStarted && <StatusChip label="📡 GPS" color={C.green} />}
          {isHomeMode && <StatusChip label="🏠 HOME" color={C.homeActive} />}
          {isDnd      && <StatusChip label="🔕 DND"  color={C.dnd} />}
          {isMovingLive && (
            <StatusChip
              label={
                liveActivity === 'DRIVING' ? '🚗 DRIVING' :
                liveActivity === 'CYCLING' ? '🚴 CYCLING' :
                '🚶 WALKING'
              }
              color={actColor}
            />
          )}
        </View>
      </View>

      {/* ── Home banner (original) ────────────────────────── */}
      {isHomeMode && (
        <View style={st.homeBanner}>
          <View style={[st.homeBannerDot, { backgroundColor: C.homeActive }]} />
          <Text style={st.homeBannerTxt}>Home Mode Active · Profile Applied</Text>
        </View>
      )}

      {/* ── NEW: GPS Live Stats Bar ───────────────────────── */}
      <GpsStatsBar ctx={liveCtx} />

      {/* ── NEW: AI Reasoning Banner ──────────────────────── */}
      {liveCtx && liveCtx.readingCount > 0 && (
        <ReasonBanner reason={liveCtx.reason} confidence={liveCtx.confidence} />
      )}

      {/* ── NEW: GPS Coordinates Card ─────────────────────── */}
      {liveCtx && liveCtx.latitude !== 0 && (
        <CoordsCard ctx={liveCtx} />
      )}

      {/* ─────────────────── CARD GRID (original) ───────────── */}
      <View style={[st.grid, isWide && st.gridWide]}>

        {/* ── CARD 1: MEETING (original) ─────────────────── */}
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
            <Btn label="📅 Detect"   onPress={handleDetectMeeting}  bg={C.accent}        loading={loading} />
            <Btn label="⚡ Inject"   onPress={handleInjectMeeting}  bg={C.amber + 'CC'} />
            <Btn label="🔔 Override" onPress={handleOverride}       outline fg={isDnd ? C.override : C.textMuted} disabled={!isDnd} />
          </View>
        </GCard>

        {/* ── CARD 2: MOVEMENT (enhanced) ─────────────────── */}
        <GCard
          style={isWide ? st.gridCell : undefined}
          glow={movementResult?.isMoving ? actColor : undefined}
        >
          <View style={st.cardHead}>
            <PulseDot color={movementResult?.isMoving ? actColor : C.textDim} active={!!movementResult?.isMoving} />
            <Text style={st.cardTitle}>Movement Detection</Text>
            {movementResult?.isMoving && (
              <View style={[st.badge, { backgroundColor: actColor + '22' }]}>
                <Text style={[st.badgeTxt, { color: actColor }]}>
                  {activityEmoji(liveActivity)} {movementResult.context}
                </Text>
              </View>
            )}
          </View>

          <Text style={st.cardReason}>
            {movementResult
              ? movementResult.isMoving
                ? `${movementResult.context} — ${movementResult.suggestion}`
                : movementResult.reason
              : 'GPS tracking active — detecting motion...'}
          </Text>

          {movementResult && (
            <View style={st.metaRow}>
              {movementResult.speedKmh !== undefined && (
                <MetaPill label={`${movementResult.speedKmh.toFixed(1)} km/h`} />
              )}
              <MetaPill label={`${(movementResult.confidence * 100).toFixed(0)}% conf`} />
              {movementResult.distanceKm && (
                <MetaPill label={`Dist: ${movementResult.distanceKm}`} />
              )}
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
            <Btn label="📡 Detect"  onPress={handleDetectMovement} bg="#0891B2" loading={loading} />
            <Btn label="🚶 Walk"    onPress={handleInjectWalking}  outline fg={C.movement} />
            <Btn label="🚴 Cycle"   onPress={handleInjectCycling}  outline fg={C.cycling}  />
            <Btn label="🚗 Drive"   onPress={handleInjectDriving}  outline fg={C.amber}    />
          </View>
        </GCard>

        {/* ── CARD 3: HOME (original) ──────────────────────── */}
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
            <Btn label="📶 Detect" onPress={handleDetectHome}  bg={C.home}      loading={loading} />
            <Btn label="🏠 Home"   onPress={handleInjectHome}  outline fg={C.homeActive} />
            <Btn label="🌍 Away"   onPress={handleInjectAway}  outline fg={C.away} />
          </View>
        </GCard>

      </View>{/* end grid */}

      {/* ── NEW: Nearby Suggestions Panel ─────────────────── */}
      {suggestions.length > 0 && (
        <SuggestionsPanel cards={suggestions} />
      )}

      {/* ─────────── SUMMARY STATS (original) ──────────────── */}
      <View style={st.statsRow}>
        <StatBox label="ACTIONS"   value={String(totalActions)}   color={C.accent}   icon="⚡" />
        <StatBox label="OVERRIDES" value={String(totalOverrides)} color={C.override} icon="🔔" />
        <StatBox label="ACCURACY"  value={totalActions > 0 ? `${accuracy}%` : '—'} color={C.idle} icon="🎯" />
        <StatBox
          label="DISTANCE"
          value={liveCtx ? liveCtx.distanceKm : '0 m'}
          color={C.cyan}
          icon="📍"
        />
      </View>

      {/* ─────────── INTEL CHIPS (original) ─────────────────── */}
      <View style={st.intelRow}>
        <IntelChip icon="⚡" text="< 100ms" />
        <IntelChip icon="🧠" text="On-device AI" />
        <IntelChip icon="📡" text="Live GPS" />
        <IntelChip icon="📴" text="Offline ready" />
      </View>

      {/* ─────────── ACTIVITY LOG (original) ─────────────────── */}
      {logs.length > 0 && (
        <GCard style={st.logCard}>
          <View style={st.logHead}>
            <Text style={st.logHeadTxt}>ACTIVITY LOG</Text>
            <View style={[st.badge, { backgroundColor: C.surfaceAlt }]}>
              <Text style={[st.badgeTxt, { color: C.textSec }]}>{logs.length} events</Text>
            </View>
          </View>

          {logs.slice(0, 12).map((entry, idx) => {
            const color = logColor(entry.context, entry.isOverride);
            return (
              <View key={entry.id} style={[st.logEntry, idx > 0 && st.logEntryBorder]}>
                <View style={[st.logBar, { backgroundColor: color }]} />
                <View style={st.logIconBox}>
                  <Text style={st.logIconTxt}>{logIcon(entry.context, entry.source)}</Text>
                </View>
                <View style={st.logBody}>
                  <View style={st.logTopRow}>
                    <Text style={[st.logCtx, { color }]}>
                      {entry.isOverride ? 'OVERRIDE' : entry.context}
                    </Text>
                    <Text style={st.logTime}>{entry.time}</Text>
                  </View>
                  <Text style={st.logAction} numberOfLines={2}>{entry.action}</Text>
                  <Text style={st.logSrc}>{entry.source}</Text>
                </View>
              </View>
            );
          })}
        </GCard>
      )}

      <Text style={st.footer}>On-device processing · Real GPS · No cloud dependency</Text>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const st = StyleSheet.create({

  // ── Layout ─────────────────────────────────────────────────
  scroll:     { flex: 1 },
  container:  {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 52 : 28,
    paddingBottom: 64,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },

  // ── Header (original) ─────────────────────────────────────
  header:    { alignItems: 'center', width: '100%', marginBottom: 16 },
  logoWrap:  { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoHalo:  { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: C.accentGlow },
  logoGlyph: { fontSize: 40, color: C.accent, lineHeight: 44 },
  brand:     { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: 8, marginBottom: 6 },
  tagline:   { fontSize: 11, color: C.textSec, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  sChip:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  sChipTxt:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // ── Home banner (original) ─────────────────────────────────
  homeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10,
    marginBottom: 12, width: '100%',
  },
  homeBannerDot: { width: 8, height: 8, borderRadius: 4 },
  homeBannerTxt: { fontSize: 13, fontWeight: '700', color: C.homeActive },

  // ── NEW: GPS Stats Bar ─────────────────────────────────────
  gpsBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52,211,153,0.06)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 12,
  },
  gpsBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gpsDot:      { width: 7, height: 7, borderRadius: 4 },
  gpsBarLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  gpsBarStats: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 14, flexWrap: 'wrap' },
  gpsStat:     { alignItems: 'center', gap: 2 },
  gpsStatIcon: { fontSize: 11 },
  gpsStatVal:  { fontSize: 13, fontWeight: '800', color: C.text },
  gpsStatUnit: { fontSize: 9, color: C.textSec, fontWeight: '600' },

  // ── NEW: AI Reasoning Banner ───────────────────────────────
  reasonBanner: {
    width: '100%',
    backgroundColor: 'rgba(108,99,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.22)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reasonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  reasonIcon:   { fontSize: 14 },
  reasonTitle:  { fontSize: 9, fontWeight: '900', color: C.accent, letterSpacing: 2, flex: 1 },
  confBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  confTxt:      { fontSize: 10, fontWeight: '800' },
  reasonText:   { fontSize: 13, color: C.reason, lineHeight: 19 },

  // ── NEW: Coords Card ───────────────────────────────────────
  coordsCard: {
    width: '100%',
    backgroundColor: 'rgba(0,210,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.18)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  coordsTitle:   { fontSize: 9, fontWeight: '900', color: C.cyan, letterSpacing: 2, marginBottom: 10 },
  coordsRow:     { flexDirection: 'row', alignItems: 'center', gap: 0 },
  coordsItem:    { flex: 1, alignItems: 'center' },
  coordsLabel:   { fontSize: 9, color: C.textSec, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  coordsVal:     { fontSize: 13, color: C.cyan, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  coordsSep:     { width: 1, height: 32, backgroundColor: C.border },
  coordsUpdated: { fontSize: 9, color: C.textDim, marginTop: 8, textAlign: 'center' },

  // ── Grid (original) ────────────────────────────────────────
  grid:     { width: '100%', gap: 14, marginBottom: 16 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  gridCell: { flex: 1, minWidth: 270 },

  // ── Glass Card (original) ──────────────────────────────────
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
  cardHead:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardTitle:  { fontSize: 15, fontWeight: '700', color: C.text, flex: 1, letterSpacing: 0.2 },
  badge:      { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  badgeTxt:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  cardReason: { fontSize: 13, color: C.reason, lineHeight: 19, marginBottom: 10 },

  metaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  metaPill:   {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  metaPillTxt:{ fontSize: 10, color: C.textSec, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Buttons (original)
  btnRow:    { flexDirection: 'row', gap: 6 },
  btn:       { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  btnTxt:    { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },

  ctaRow:    { flexDirection: 'row', gap: 10, marginBottom: 12 },
  ctaBtn:    { flex: 1, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ctaBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  profileGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    backgroundColor: 'rgba(52,211,153,0.07)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.15)',
    borderRadius: 12, padding: 12, marginBottom: 12,
  },
  profileItem: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: '45%' },
  profileIcon: { fontSize: 12 },
  profileVal:  { fontSize: 10, color: C.textSec, fontWeight: '600' },

  // ── Stats (original + distance added) ─────────────────────
  statsRow: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 14, flexWrap: 'wrap' },
  statBox:  {
    flex: 1, minWidth: 70,
    backgroundColor: C.surface,
    borderRadius: 18, borderWidth: 1,
    paddingVertical: 16, alignItems: 'center',
  },
  statIcon:  { fontSize: 18, marginBottom: 4 },
  statVal:   { fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  statLabel: { fontSize: 8, color: C.textDim, marginTop: 3, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },

  // ── NEW: Suggestions panel ─────────────────────────────────
  suggestWrap: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1, borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },
  suggestHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  suggestTitle:   { fontSize: 10, fontWeight: '900', color: C.text, letterSpacing: 2 },
  suggestSub:     { fontSize: 10, color: C.textSec },
  suggestGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggestCard:    {
    flex: 1, minWidth: '44%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  suggestIconWrap:{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  suggestIcon:    { fontSize: 20 },
  suggestLabel:   { fontSize: 12, fontWeight: '700', color: C.text, textAlign: 'center' },
  suggestCat:     { fontSize: 9, color: C.textSec, textAlign: 'center' },
  suggestDist:    { fontSize: 10, fontWeight: '700', marginTop: 2 },

  // ── Intel chips (original) ─────────────────────────────────
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

  // ── Event log (original) ───────────────────────────────────
  logCard: { width: '100%', padding: 0, overflow: 'hidden', marginBottom: 16 },
  logHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  logHeadTxt:     { fontSize: 10, fontWeight: '900', color: C.textSec, letterSpacing: 2.5 },
  logEntry:       { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 16 },
  logEntryBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.05)' },
  logBar:         { width: 3, borderRadius: 2, minHeight: 44, marginRight: 11 },
  logIconBox:     { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  logIconTxt:     { fontSize: 14 },
  logBody:        { flex: 1 },
  logTopRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  logCtx:         { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  logTime:        { fontSize: 10, color: C.textDim, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  logAction:      { fontSize: 12, color: C.text, fontWeight: '600', marginBottom: 2 },
  logSrc:         { fontSize: 10, color: C.textMuted, fontWeight: '600' },

  // ── Footer ─────────────────────────────────────────────────
  footer: { marginTop: 8, fontSize: 10, color: C.textDim, textAlign: 'center', letterSpacing: 0.5 },

  surfaceAlt: { backgroundColor: C.surfaceAlt },
});
