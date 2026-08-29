import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type LivingBackgroundVariant = 'home' | 'live' | 'sylora' | 'inbox' | 'profile' | 'studio' | 'default';

type Props = {
  /** `live` remains for existing full-screen LIVE routes. */
  live?: boolean;
  variant?: LivingBackgroundVariant;
};

const palettes: Record<LivingBackgroundVariant, [string, string, string]> = {
  home: ['#FBF9F5', '#F1F5F2', '#F7F1E8'],
  live: ['#111018', '#261928', '#0D0C12'],
  sylora: ['#FBF9F5', '#F1ECF8', '#F7F3EC'],
  inbox: ['#F9FAF8', '#ECF3F4', '#F6F1EB'],
  profile: ['#FBF9F5', '#F4EFE7', '#EEF3F1'],
  studio: ['#F8F9F7', '#EFF0F7', '#F5F1E9'],
  default: ['#FBF9F5', '#F4EFF2', '#F7F3EC']
};

export function LivingBackground({ live = false, variant = 'default' }: Props) {
  const scene: LivingBackgroundVariant = live ? 'live' : variant;
  const drift = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduced) {
      drift.stopAnimation();
      pulse.stopAnimation();
      drift.setValue(0);
      pulse.setValue(0);
      return;
    }
    const driftLoop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 18_000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 18_000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ]));
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: scene === 'live' ? 2_200 : 4_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: scene === 'live' ? 2_200 : 4_800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ]));
    driftLoop.start();
    pulseLoop.start();
    return () => { driftLoop.stop(); pulseLoop.stop(); };
  }, [drift, pulse, reduced, scene]);

  const animation = useMemo(() => ({
    shiftA: drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 28] }),
    shiftB: drift.interpolate({ inputRange: [0, 1], outputRange: [22, -24] }),
    sweep: drift.interpolate({ inputRange: [0, 1], outputRange: [-120, 220] }),
    rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '352deg'] }),
    breathe: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }),
    fade: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.34] }),
    messageShift: pulse.interpolate({ inputRange: [0, 1], outputRange: [-8, 12] })
  }), [drift, pulse]);

  const liveScene = scene === 'live';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={palettes[scene]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.orb, styles.orbA, { transform: [{ translateX: animation.shiftA }, { translateY: animation.shiftB }] }, liveScene && styles.liveOrb]} />
      <Animated.View style={[styles.orb, styles.orbB, { transform: [{ translateX: animation.shiftB }, { translateY: animation.shiftA }] }, liveScene && styles.liveOrbB]} />

      {(scene === 'home' || scene === 'default') ? (
        <View style={styles.homeScene}>
          <Animated.View style={[styles.horizonBand, styles.homeBandA, { transform: [{ translateX: animation.shiftA }, { rotate: '-4deg' }] }]} />
          <Animated.View style={[styles.horizonBand, styles.homeBandB, { transform: [{ translateX: animation.shiftB }, { rotate: '5deg' }] }]} />
          <Animated.View style={[styles.homeCrystal, { opacity: animation.fade, transform: [{ rotate: animation.rotate }, { scale: animation.breathe }] }]} />
        </View>
      ) : null}

      {scene === 'live' ? (
        <View style={styles.liveScene}>
          <Animated.View style={[styles.liveRing, styles.liveRingA, { opacity: animation.fade, transform: [{ scale: animation.breathe }] }]} />
          <Animated.View style={[styles.liveRing, styles.liveRingB, { opacity: animation.fade, transform: [{ scale: animation.breathe }] }]} />
          <Animated.View style={[styles.liveSweep, { transform: [{ translateX: animation.sweep }, { rotate: '-12deg' }] }]} />
        </View>
      ) : null}

      {scene === 'sylora' ? (
        <View style={styles.syloraScene}>
          <Animated.View style={[styles.aiOrbit, styles.aiOrbitA, { opacity: animation.fade, transform: [{ rotate: animation.rotate }, { scale: animation.breathe }] }]} />
          <Animated.View style={[styles.aiOrbit, styles.aiOrbitB, { opacity: animation.fade, transform: [{ rotate: animation.rotate }] }]} />
          <View style={styles.voiceWave}>{[18, 34, 52, 31, 20].map((height, index) => <Animated.View key={`${height}-${index}`} style={[styles.voiceBar, { height, opacity: animation.fade, transform: [{ scaleY: animation.breathe }], marginLeft: index ? 7 : 0 }]} />)}</View>
        </View>
      ) : null}

      {scene === 'inbox' ? (
        <View style={styles.inboxScene}>
          <Animated.View style={[styles.messageShape, styles.messageA, { opacity: animation.fade, transform: [{ translateX: animation.messageShift }] }]} />
          <Animated.View style={[styles.messageShape, styles.messageB, { opacity: animation.fade, transform: [{ translateX: animation.shiftA }] }]} />
          <Animated.View style={[styles.signalLine, { transform: [{ translateX: animation.sweep }] }]} />
        </View>
      ) : null}

      {scene === 'profile' ? (
        <View style={styles.profileScene}>
          <Animated.View style={[styles.profileOrbit, { opacity: animation.fade, transform: [{ rotate: animation.rotate }] }]}><View style={styles.profileSatellite} /></Animated.View>
          <Animated.View style={[styles.profileCore, { transform: [{ scale: animation.breathe }] }]} />
        </View>
      ) : null}

      {scene === 'studio' ? (
        <View style={styles.studioScene}>
          <Animated.View style={[styles.previewFrame, styles.previewA, { transform: [{ translateX: animation.shiftA }] }]} />
          <Animated.View style={[styles.previewFrame, styles.previewB, { transform: [{ translateX: animation.shiftB }] }]} />
          <Animated.View style={[styles.studioScan, { transform: [{ translateY: animation.sweep }] }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', width: 280, height: 280, borderRadius: 999, opacity: 0.16 },
  orbA: { top: -80, right: -90, backgroundColor: '#DDBF88' },
  orbB: { bottom: 80, left: -130, backgroundColor: '#8FBBB3' },
  liveOrb: { backgroundColor: '#F3539A', opacity: 0.15 },
  liveOrbB: { backgroundColor: '#7869D8', opacity: 0.17 },

  homeScene: { position: 'absolute', inset: 0, overflow: 'hidden' },
  horizonBand: { position: 'absolute', left: -90, right: -90, height: 170, borderRadius: 999, borderTopWidth: 1, borderBottomWidth: 1, borderTopColor: 'rgba(138,187,178,0.20)', borderBottomColor: 'rgba(185,138,67,0.10)' },
  homeBandA: { top: '27%' },
  homeBandB: { top: '62%', opacity: 0.55 },
  homeCrystal: { position: 'absolute', top: 70, right: 36, width: 126, height: 126, borderRadius: 42, borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)', backgroundColor: 'rgba(213,173,112,0.06)' },

  liveScene: { position: 'absolute', inset: 0, overflow: 'hidden' },
  liveRing: { position: 'absolute', width: 270, height: 270, borderRadius: 150, borderWidth: 1, borderColor: 'rgba(244,83,154,0.32)', shadowColor: '#F3539A', shadowOpacity: 0.12, shadowRadius: 35 },
  liveRingA: { top: 70, right: -95 },
  liveRingB: { top: 132, right: -33, width: 146, height: 146 },
  liveSweep: { position: 'absolute', top: '42%', left: -180, width: 260, height: 1, backgroundColor: 'rgba(255,117,177,0.28)' },

  syloraScene: { position: 'absolute', inset: 0, alignItems: 'center', overflow: 'hidden' },
  aiOrbit: { position: 'absolute', top: 90, width: 310, height: 310, borderRadius: 170, borderWidth: 1, borderColor: 'rgba(128,96,167,0.22)' },
  aiOrbitA: { borderTopColor: 'rgba(213,173,112,0.52)', borderRightColor: 'rgba(255,255,255,0.84)' },
  aiOrbitB: { top: 143, width: 204, height: 204, borderLeftColor: 'rgba(213,173,112,0.38)' },
  voiceWave: { position: 'absolute', top: 445, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 58 },
  voiceBar: { width: 2, borderRadius: 2, backgroundColor: '#8060A7' },

  inboxScene: { position: 'absolute', inset: 0, overflow: 'hidden' },
  messageShape: { position: 'absolute', width: 145, height: 68, borderWidth: 1, borderColor: 'rgba(82,127,155,0.20)', backgroundColor: 'rgba(255,255,255,0.22)' },
  messageA: { top: 96, right: -24, borderRadius: 24, borderBottomRightRadius: 7 },
  messageB: { top: 320, left: -32, width: 116, height: 56, borderRadius: 21, borderBottomLeftRadius: 7 },
  signalLine: { position: 'absolute', top: '58%', left: -230, width: 240, height: 1, backgroundColor: 'rgba(82,127,155,0.19)' },

  profileScene: { position: 'absolute', inset: 0, alignItems: 'center', overflow: 'hidden' },
  profileOrbit: { position: 'absolute', top: 80, width: 300, height: 300, borderRadius: 160, borderWidth: 1, borderColor: 'rgba(168,134,81,0.18)' },
  profileSatellite: { position: 'absolute', top: 24, left: 42, width: 12, height: 12, borderRadius: 8, backgroundColor: '#D5AD70', shadowColor: '#A88651', shadowOpacity: 0.24, shadowRadius: 12 },
  profileCore: { position: 'absolute', top: 185, width: 92, height: 92, borderRadius: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.88)', backgroundColor: 'rgba(213,173,112,0.08)' },

  studioScene: { position: 'absolute', inset: 0, overflow: 'hidden' },
  previewFrame: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(117,98,170,0.16)', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 28 },
  previewA: { top: 100, left: -42, width: 240, height: 150 },
  previewB: { top: 390, right: -36, width: 190, height: 120 },
  studioScan: { position: 'absolute', top: 0, left: 20, right: 20, height: 1, backgroundColor: 'rgba(117,98,170,0.18)' }
});
