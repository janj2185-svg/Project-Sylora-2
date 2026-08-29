import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { GlassCard } from '@/components/GlassCard';
import { IntegrationStrip } from '@/components/IntegrationStrip';
import { LivingBackground } from '@/components/LivingBackground';
import { LivingButton } from '@/components/LivingButton';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii } from '@/theme';
import type { LiveRoom } from '@/types';

export default function LiveTab() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [title, setTitle] = useState('Мій живий світ');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { const data = await api.request<{ rooms: LiveRoom[] }>('/api/live'); setRooms(data.rooms); }, []);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const create = async () => {
    setBusy(true);
    try {
      const result = await api.post<{ live: LiveRoom }>('/api/live', { title });
      router.push({ pathname: '/live/[id]', params: { id: result.live.id, host: '1' } });
    } finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LivingBackground variant="live" />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl tintColor="#FFF" refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={styles.heading}><Text style={styles.eyebrow}>SYLORA LIVE</Text><Text style={styles.title}>Ефір, який відчуває аудиторію.</Text><Text style={styles.copy}>Камера, мікрофон, Sylora co-host і мультистрім — у єдиному життєвому циклі.</Text></View>
        <IntegrationStrip />
        <GlassCard style={styles.createCard}>
          <SectionTitle eyebrow="CREATE → AI → LIVE" title="Запустити ефір" />
          <TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder="Назва LIVE" placeholderTextColor="#8C8790" style={styles.input} />
          <View style={styles.checks}><Text>● Камера й мікрофон — запитаємо дозвіл</Text><Text>● TikFinity — через захищений companion на ПК</Text><Text>● TikTok / YouTube — через RTMP(S) після додавання stream key</Text></View>
          <LivingButton kind="live" disabled={busy || !title.trim()} label={busy ? 'Створюю…' : 'Почати ефір'} onPress={create} />
        </GlassCard>
        <SectionTitle eyebrow="DISCOVER" title="Активні LIVE" />
        {rooms.map(room => <GlassCard key={room.id} style={styles.room}><View style={styles.roomTop}><Text style={styles.badge}>● LIVE</Text><Text style={styles.viewer}>{room.viewerCount || 0} глядачів</Text></View><Text style={styles.roomTitle}>{room.title}</Text><Text style={styles.host}>@{room.host?.username || 'creator'}</Text><LivingButton kind="pearl" label="Дивитися" onPress={() => router.push({ pathname: '/live/[id]', params: { id: room.id } })} /></GlassCard>)}
        {!rooms.length ? <Text style={styles.empty}>Активних ефірів поки немає.</Text> : null}
        <View style={{ height: 105 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.void }, content: { padding: 18, gap: 18 },
  heading: { paddingTop: 10, gap: 8 }, eyebrow: { color: '#FF6CA9', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFF', fontSize: 40, lineHeight: 44, fontWeight: '700' }, copy: { color: 'rgba(255,255,255,0.66)', fontSize: 14, lineHeight: 21 },
  createCard: { gap: 14 }, input: { minHeight: 54, borderRadius: radii.medium, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, color: colors.ink, fontWeight: '700' },
  checks: { gap: 7 }, room: { gap: 9, backgroundColor: 'rgba(255,255,255,0.88)' }, roomTop: { flexDirection: 'row', justifyContent: 'space-between' }, badge: { color: colors.live, fontSize: 11, fontWeight: '900' }, viewer: { color: colors.muted, fontSize: 12 }, roomTitle: { color: colors.ink, fontSize: 26, fontWeight: '700' }, host: { color: colors.champagne, fontWeight: '700' }, empty: { color: 'rgba(255,255,255,0.58)' }
});
