import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { GlassCard } from '@/components/GlassCard';
import { InstantClip } from '@/components/InstantClip';
import { IntegrationStrip } from '@/components/IntegrationStrip';
import { LivingBackground } from '@/components/LivingBackground';
import { LivingButton } from '@/components/LivingButton';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii } from '@/theme';
import type { LiveRoom, VideoItem } from '@/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    const [live, clips] = await Promise.all([
      api.request<{ rooms: LiveRoom[] }>('/api/live').catch(() => ({ rooms: [] })),
      api.request<{ videos: VideoItem[] }>('/api/videos?format=clip').catch(() => ({ videos: [] }))
    ]);
    setRooms(live.rooms); setVideos(clips.videos);
  }, []);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LivingBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.header}><BrandLogo width={148} /><View style={styles.signal}><View style={styles.signalDot} /><Text>LIVE READY</Text></View></View>
        <GlassCard style={styles.hero}>
          <Text style={styles.eyebrow}>LIVING HORIZON · ДОБРИЙ ДЕНЬ</Text>
          <Text style={styles.heroTitle}>{user?.displayName ? `${user.displayName}, твій світ уже рухається.` : 'Твій світ уже рухається.'}</Text>
          <Text style={styles.heroText}>Створюй, говори із Sylora та виходь у LIVE без розкиданих панелей.</Text>
          <View style={styles.actions}><LivingButton label="Створити" onPress={() => router.push('/(tabs)/live')} style={styles.action} /><LivingButton kind="pearl" label="Відкрити Sylora" onPress={() => router.push('/(tabs)/sylora')} style={styles.action} /></View>
          <View style={styles.horizonPulse}><View style={styles.horizonLine} /><View style={styles.horizonLine} /><View style={styles.horizonLine} /></View>
        </GlassCard>
        <SectionTitle eyebrow="ПІДКЛЮЧЕННЯ" title="Один ефір — усі платформи" />
        <IntegrationStrip />
        <SectionTitle eyebrow="ЗАРАЗ У SYLORA" title="Живий момент" />
        {rooms[0] ? <GlassCard style={styles.liveCard}><View style={styles.liveTop}><Text style={styles.liveBadge}>● LIVE</Text><Text style={styles.viewers}>{rooms[0].viewerCount || 0} дивляться</Text></View><Text style={styles.liveTitle}>{rooms[0].title}</Text><Text style={styles.liveHost}>@{rooms[0].host?.username || 'creator'}</Text><LivingButton kind="live" label="Відкрити LIVE" onPress={() => router.push({ pathname: '/live/[id]', params: { id: rooms[0]!.id } })} /></GlassCard> : <GlassCard><Text style={styles.empty}>Тихо — саме час запустити перший ефір.</Text></GlassCard>}
        {videos[0] ? <><SectionTitle eyebrow="CLIPS" title="Миттєвий перегляд" /><InstantClip video={videos[0]} nextVideo={videos[1]} /></> : null}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pearl }, content: { paddingHorizontal: 17, paddingTop: 2, gap: 17 },
  header: { minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.frost, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 7 },
  signalDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success },
  hero: { minHeight: 290, justifyContent: 'flex-end', overflow: 'hidden' },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  heroTitle: { color: colors.ink, fontSize: 36, lineHeight: 41, fontWeight: '700', maxWidth: 330 },
  heroText: { color: colors.muted, fontSize: 14, lineHeight: 21, maxWidth: 310 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 }, action: { flex: 1 },
  liveCard: { backgroundColor: '#17151D', borderColor: 'rgba(255,255,255,0.12)', gap: 10 },
  liveTop: { flexDirection: 'row', justifyContent: 'space-between' }, liveBadge: { color: '#FF6AA8', fontSize: 11, fontWeight: '900' }, viewers: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  liveTitle: { color: '#FFF', fontSize: 29, lineHeight: 34, fontWeight: '700' }, liveHost: { color: colors.champagneSoft, marginBottom: 6 }, empty: { color: colors.muted, fontSize: 14 },
  bottomSpace: { height: 105 },
  horizonPulse: { position: 'absolute', top: 24, right: -28, width: 180, gap: 16, opacity: 0.2, transform: [{ rotate: '-12deg' }] },
  horizonLine: { height: 1, backgroundColor: colors.champagne }
});
