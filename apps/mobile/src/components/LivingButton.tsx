import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, shadows } from '../theme';

type Props = { label: string; onPress?: () => void; kind?: 'metal' | 'pearl' | 'live'; disabled?: boolean; style?: ViewStyle };

export function LivingButton({ label, onPress, kind = 'metal', disabled, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (toValue: number) => Animated.spring(scale, { toValue, useNativeDriver: true, speed: 28, bounciness: 4 }).start();
  const colorsByKind: Record<NonNullable<Props['kind']>, readonly [string, string]> = {
    metal: ['#36343B', '#19181D'],
    pearl: ['#FFFFFF', '#EEE8DF'],
    live: ['#F65094', '#C91D68']
  };
  return (
    <Animated.View style={[style, { transform: [{ scale }], opacity: disabled ? 0.48 : 1 }]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onPress?.(); }}
      >
        <LinearGradient colors={colorsByKind[kind]} style={[styles.button, kind === 'pearl' ? styles.pearl : styles.dark]}>
          <Text style={[styles.label, kind === 'pearl' && styles.pearlLabel]}>{label}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 50, paddingHorizontal: 19, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dark: { borderColor: 'rgba(255,255,255,0.17)', ...shadows.metal },
  pearl: { borderColor: 'rgba(255,255,255,0.9)', ...shadows.pearl },
  label: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  pearlLabel: { color: colors.ink }
});
