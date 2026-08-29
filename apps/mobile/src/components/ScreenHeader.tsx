import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../theme';

export function ScreenHeader({ title, dark = false }: { title: string; dark?: boolean }) {
  return <View style={styles.row}><Pressable accessibilityLabel="Назад" onPress={() => router.back()} style={[styles.back, dark && styles.backDark]}><Ionicons name="chevron-back" size={23} color={dark ? '#FFF' : colors.ink} /></Pressable><Text numberOfLines={1} style={[styles.title, dark && { color: '#FFF' }]}>{title}</Text><View style={styles.spacer} /></View>;
}

const styles = StyleSheet.create({ row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.78)' }, backDark: { backgroundColor: 'rgba(255,255,255,0.1)' }, title: { flex: 1, color: colors.ink, textAlign: 'center', fontSize: 16, fontWeight: '800' }, spacer: { width: 44 } });
