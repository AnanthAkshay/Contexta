/**
 * Contexta — app/(tabs)/settings.tsx
 * ─────────────────────────────────────────────────────────────
 * REDESIGNED: Premium Glassmorphism Light Theme
 * ALL original logic preserved 100% — only UI/UX upgraded.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView,
  TextInput, Platform, Alert, Animated,
} from 'react-native';

import { getHomeSSID, setHomeSSID, setCurrentAsHome, toggleSimulatedLocation } from '@/services/homeBridge';

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg:          '#EEF2FF',
  glass:       'rgba(255, 255, 255, 0.72)',
  glassStrong: 'rgba(255, 255, 255, 0.90)',
  border:      'rgba(200, 210, 255, 0.40)',
  borderMid:   'rgba(180, 190, 255, 0.28)',
  borderSubtle:'rgba(200, 210, 240, 0.35)',
  violet:      '#7C3AED',
  violetLight: '#A78BFA',
  violetDim:   'rgba(124, 58, 237, 0.09)',
  blue:        '#3B82F6',
  blueDim:     'rgba(59, 130, 246, 0.09)',
  cyan:        '#06B6D4',
  cyanDim:     'rgba(6, 182, 212, 0.09)',
  emerald:     '#10B981',
  emeraldDim:  'rgba(16, 185, 129, 0.09)',
  coral:       '#F43F5E',
  coralDim:    'rgba(244, 63, 94, 0.09)',
  amber:       '#F59E0B',
  amberDim:    'rgba(245, 158, 11, 0.09)',
  text:        '#0F172A',
  textSec:     '#475569',
  textDim:     '#94A3B8',
  textMuted:   '#CBD5E1',
};

// ─── Animated Btn ────────────────────────────────────────────
function ActionBtn({ label, onPress, color, outline }: {
  label: string; onPress: () => void; color: string; outline?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, friction: 8 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 8 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={{ flex: 1 }}>
      <Animated.View style={[
        st.actionBtn,
        outline
          ? { backgroundColor: color + '12', borderWidth: 1.5, borderColor: color + '50' }
          : { backgroundColor: color,
              ...Platform.select({
                ios: { shadowColor: color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10 },
                android: { elevation: 5 },
              }),
            },
        { transform: [{ scale }] },
      ]}>
        <Text style={[st.actionBtnTxt, { color: outline ? color : '#fff' }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Glass Section Card ──────────────────────────────────────
function SectionCard({ children, accentColor }: { children: React.ReactNode; accentColor?: string }) {
  return (
    <View style={[st.section, accentColor && { borderTopWidth: 2.5, borderTopColor: accentColor }]}>
      <View style={st.sectionInnerGlow} pointerEvents="none" />
      {children}
    </View>
  );
}

// ─── Threshold Row ───────────────────────────────────────────
function ThresholdRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[st.thresholdRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={st.thresholdLabel}>{label}</Text>
      <View style={st.thresholdValueWrap}>
        <Text style={st.thresholdValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const [homeSSID,    setHomeSSIDState] = useState(getHomeSSID());
  const [inputSSID,   setInputSSID]     = useState(homeSSID);
  const [saved,       setSaved]         = useState(false);

  const handleSaveSSID = useCallback(() => {
    if (inputSSID.trim()) {
      setHomeSSID(inputSSID.trim());
      setHomeSSIDState(inputSSID.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }, [inputSSID]);

  const handleSetCurrent = useCallback(() => {
    const ssid = setCurrentAsHome();
    if (ssid) {
      setHomeSSIDState(ssid);
      setInputSSID(ssid);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }, []);

  const handleToggleLocation = useCallback(() => {
    const isHome = toggleSimulatedLocation();
    Alert.alert('Demo Location', `Simulated location set to: ${isHome ? '🏠 HOME' : '🌍 AWAY'}`);
  }, []);

  return (
    <ScrollView
      style={st.scroll}
      contentContainerStyle={st.content}
      bounces
      showsVerticalScrollIndicator={false}
    >
      {/* Ambient bg blobs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position:'absolute', top:-40,  left:-60,  width:220, height:220, borderRadius:110, backgroundColor:'rgba(124,58,237,0.07)' }} />
        <View style={{ position:'absolute', top:200,  right:-50, width:180, height:180, borderRadius:90,  backgroundColor:'rgba(6,182,212,0.07)'   }} />
        <View style={{ position:'absolute', top:500,  left:-40,  width:160, height:160, borderRadius:80,  backgroundColor:'rgba(244,63,94,0.06)'   }} />
      </View>

      {/* ── Header ──────────────────────────────────────── */}
      <View style={st.header}>
        <View style={st.headerIconWrap}>
          <Text style={st.headerIcon}>⚙️</Text>
        </View>
        <Text style={st.headerTitle}>Settings</Text>
        <Text style={st.headerSub}>Configure your Contexta preferences</Text>
      </View>

      {/* ── Home Network ─────────────────────────────── */}
      <SectionCard accentColor={C.emerald}>
        <View style={st.sectionHeaderRow}>
          <View style={[st.sectionIconBadge, { backgroundColor: C.emeraldDim }]}>
            <Text style={st.sectionIconEmoji}>🏠</Text>
          </View>
          <View>
            <Text style={st.sectionTitle}>Home Network</Text>
            <Text style={st.sectionDesc}>WiFi SSID for Home Mode detection</Text>
          </View>
        </View>

        <View style={st.cardDivider} />

        <Text style={st.fieldLabel}>Home WiFi SSID</Text>
        <TextInput
          style={st.input}
          value={inputSSID}
          onChangeText={setInputSSID}
          placeholder="Enter your home network name"
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={st.btnRow}>
          <ActionBtn label="💾 Save SSID"        onPress={handleSaveSSID}   color={C.emerald} />
          <ActionBtn label="📍 Set as Home"       onPress={handleSetCurrent} color={C.blue}    outline />
        </View>

        {saved && (
          <View style={st.savedBanner}>
            <Text style={st.savedDot}>✅</Text>
            <Text style={st.savedText}>SSID saved: <Text style={{ fontWeight: '800' }}>{homeSSID}</Text></Text>
          </View>
        )}

        <View style={st.infoCard}>
          <Text style={st.infoLabel}>Current Home SSID</Text>
          <Text style={[st.infoValue, { color: C.emerald }]}>{homeSSID}</Text>
        </View>
      </SectionCard>

      {/* ── Demo Controls ─────────────────────────────── */}
      <SectionCard accentColor={C.cyan}>
        <View style={st.sectionHeaderRow}>
          <View style={[st.sectionIconBadge, { backgroundColor: C.cyanDim }]}>
            <Text style={st.sectionIconEmoji}>🔧</Text>
          </View>
          <View>
            <Text style={st.sectionTitle}>Demo Controls</Text>
            <Text style={st.sectionDesc}>Simulate location for testing</Text>
          </View>
        </View>

        <View style={st.cardDivider} />

        <ActionBtn label="🔄 Toggle Home / Away (Demo)" onPress={handleToggleLocation} color={C.cyan} />
      </SectionCard>

      {/* ── Detection Thresholds ──────────────────────── */}
      <SectionCard accentColor={C.violet}>
        <View style={st.sectionHeaderRow}>
          <View style={[st.sectionIconBadge, { backgroundColor: C.violetDim }]}>
            <Text style={st.sectionIconEmoji}>📊</Text>
          </View>
          <View>
            <Text style={st.sectionTitle}>Detection Thresholds</Text>
            <Text style={st.sectionDesc}>Sensor sensitivity & confidence levels</Text>
          </View>
        </View>

        <View style={st.cardDivider} />

        <ThresholdRow label="Movement Variance"   value="> 0.8" />
        <ThresholdRow label="Driving Variance"    value="> 3.0" />
        <ThresholdRow label="Meeting Confidence"  value="0.91"  />
        <ThresholdRow label="Home Confidence"     value="0.95"  />
        <ThresholdRow label="Sensor Interval"     value="500ms" isLast />
      </SectionCard>

      {/* ── About ─────────────────────────────────────── */}
      <SectionCard accentColor={C.coral}>
        <View style={st.sectionHeaderRow}>
          <View style={[st.sectionIconBadge, { backgroundColor: C.coralDim }]}>
            <Text style={st.sectionIconEmoji}>ℹ️</Text>
          </View>
          <View>
            <Text style={st.sectionTitle}>About Contexta</Text>
            <Text style={st.sectionDesc}>Version & project info</Text>
          </View>
        </View>

        <View style={st.cardDivider} />

        <View style={st.aboutRow}>
          <Text style={st.aboutKey}>Version</Text>
          <Text style={st.aboutVal}>1.0</Text>
        </View>
        <View style={st.aboutRow}>
          <Text style={st.aboutKey}>Project</Text>
          <Text style={st.aboutVal}>Samsung PRISM</Text>
        </View>
        <View style={st.aboutRow}>
          <Text style={st.aboutKey}>Processing</Text>
          <Text style={st.aboutVal}>On-device only</Text>
        </View>
        <View style={[st.aboutRow, { borderBottomWidth: 0 }]}>
          <Text style={st.aboutKey}>Cloud</Text>
          <Text style={[st.aboutVal, { color: C.emerald }]}>Zero dependency</Text>
        </View>
      </SectionCard>

      {/* Bottom intel chips */}
      <View style={st.intelRow}>
        {['⚡ < 100ms', '🧠 On-device AI', '🔒 Private', '📴 Offline'].map(t => (
          <View key={t} style={st.iChip}>
            <Text style={st.iChipTxt}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: C.bg },
  content:  { paddingTop: Platform.OS === 'android' ? 48 : 24, paddingBottom: 44, paddingHorizontal: 16 },

  header: { alignItems: 'center', marginBottom: 24 },
  headerIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.violet, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 6 },
    }),
  },
  headerIcon:   { fontSize: 26 },
  headerTitle:  { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: 0.5, marginBottom: 4 },
  headerSub:    { fontSize: 12, color: C.textSec, fontWeight: '600' },

  section: {
    backgroundColor: C.glass,
    borderRadius: 24, borderWidth: 1, borderColor: C.border,
    padding: 20, marginBottom: 14, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.09, shadowRadius: 20 },
      android: { elevation: 5 },
    }),
  },
  sectionInnerGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 56,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sectionIconBadge: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sectionIconEmoji: { fontSize: 20 },
  sectionTitle:     { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: 0.1 },
  sectionDesc:      { fontSize: 11, color: C.textSec, fontWeight: '600', marginTop: 1 },
  cardDivider:      { height: 1, backgroundColor: C.borderSubtle, marginBottom: 16 },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.textSec, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: {
    backgroundColor: C.glassStrong,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text, fontWeight: '600',
    marginBottom: 12,
  },

  btnRow:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn:    { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  actionBtnTxt: { fontSize: 13, fontWeight: '700' },

  savedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.emeraldDim,
    borderWidth: 1, borderColor: C.emerald + '30',
    borderRadius: 12, padding: 10, marginBottom: 12,
  },
  savedDot:  { fontSize: 14 },
  savedText: { fontSize: 12, color: C.emerald, fontWeight: '600' },

  infoCard: {
    backgroundColor: C.glassStrong,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14,
  },
  infoLabel: { fontSize: 10, color: C.textDim, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  infoValue: { fontSize: 18, fontWeight: '800' },

  thresholdRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.borderSubtle,
  },
  thresholdLabel:     { fontSize: 13, color: C.textSec, fontWeight: '500' },
  thresholdValueWrap: { backgroundColor: C.glassStrong, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  thresholdValue:     { fontSize: 13, color: C.text, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  aboutRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderSubtle,
  },
  aboutKey: { fontSize: 13, color: C.textSec, fontWeight: '500' },
  aboutVal: { fontSize: 13, color: C.text, fontWeight: '700' },

  intelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4, marginBottom: 4 },
  iChip:    {
    backgroundColor: C.glass, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#4F46E5', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  iChipTxt: { fontSize: 11, color: C.textSec, fontWeight: '600' },
});
