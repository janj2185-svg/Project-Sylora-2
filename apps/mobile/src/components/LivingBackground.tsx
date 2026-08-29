import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function LivingBackground({ live = false }: { live?: boolean }) {
  const drift = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (reduced) { drift.stopAnimation(); drift.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 18_000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 18_000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, [drift, reduced]);
  const shiftA = drift.interpolate({ inputRange: [0, 1], outputRange: [-18, 28] });
  const shiftB = drift.interpolate({ inputRange: [0, 1], outputRange: [22, -24] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={live ? ['#111018', '#261928', '#0D0C12'] : ['#FBF9F5', '#F4EFF2', '#F7F3EC']} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.orb, styles.orbA, { transform: [{ translateX: shiftA }, { translateY: shiftB }] }, live && styles.liveOrb]} />
      <Animated.View style={[styles.orb, styles.orbB, { transform: [{ translateX: shiftB }, { translateY: shiftA }] }, live && styles.liveOrbB]} />
      <View style={[styles.horizon, live && styles.liveHorizon]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', width: 280, height: 280, borderRadius: 999, opacity: 0.18 },
  orbA: { top: -80, right: -90, backgroundColor: '#DDBF88' },
  orbB: { bottom: 80, left: -130, backgroundColor: '#A796E5' },
  liveOrb: { backgroundColor: '#F3539A', opacity: 0.16 },
  liveOrbB: { backgroundColor: '#7869D8', opacity: 0.18 },
  horizon: { position: 'absolute', left: -80, right: -80, top: '36%', height: 1, backgroundColor: 'rgba(185,138,67,0.24)', transform: [{ rotate: '-4deg' }] },
  liveHorizon: { backgroundColor: 'rgba(244,111,164,0.32)' }
});
