import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { GlassCard } from '@/components/GlassCard';
import { LivingBackground } from '@/components/LivingBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme';

type Gift = { id: string; name: string; price: number; description?: string };
export default function GiftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const [gift, setGift] = useState<Gift | null>(null);
  useEffect(() => { api.request<{ gifts: Gift[] }>('/api/gifts').then(data => setGift(data.gifts.find(item => item.id === id) || null)).catch(() => {}); }, [id]);
  return <SafeAreaView style={styles.safe}><LivingBackground /><View style={styles.content}><ScreenHeader title="SYLORA Gift" /><GlassCard style={styles.card}><Text style={styles.glyph}>✦</Text><Text style={styles.name}>{gift?.name || 'Gift'}</Text><Text style={styles.price}>◈ {gift?.price || 0}</Text><Text style={styles.copy}>{gift?.description || 'Кінематографічний подарунок із причинно пов’язаною анімацією та звуком.'}</Text></GlassCard></View></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.pearl }, content: { flex: 1, padding: 16 }, card: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, glyph: { fontSize: 100, color: colors.champagne }, name: { color: colors.ink, fontSize: 34, fontWeight: '800' }, price: { color: colors.champagne, fontSize: 18, fontWeight: '900' }, copy: { color: colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 300 } });
