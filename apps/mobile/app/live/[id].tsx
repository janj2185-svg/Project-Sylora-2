import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RTCView } from 'react-native-webrtc';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { GlassCard } from '@/components/GlassCard';
import { LivingBackground } from '@/components/LivingBackground';
import { LivingButton } from '@/components/LivingButton';
import { useHostBroadcast, useViewerTransport } from '@/live/useLiveTransport';
import { useSyloraRealtime } from '@/live/useSyloraRealtime';
import { colors, radii } from '@/theme';
import type { ExternalLiveEvent, LiveRoom } from '@/types';

type Pairing = { token: string; pairing: { id: string; expiresAt: string } };
type ResponseMode = 'manual' | 'mentions' | 'all';

function eventText(event: ExternalLiveEvent) {
  if (event.type === 'gift') return `${event.user?.displayName || 'Viewer'}: ${event.gift?.name} ×${event.gift?.count || 1}`;
  if (event.type === 'guest') return `${event.user?.displayName || 'Guest'} · ${event.guest?.status || 'guest request'}`;
  return `${event.user?.displayName || event.user?.username || 'Viewer'}: ${event.text || event.type}`;
}

export default function LiveRoomScreen() {
  const params = useLocalSearchParams<{ id: string; host?: string }>();
  const liveId = String(params.id);
  const { user } = useAuth();
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [events, setEvents] = useState<ExternalLiveEvent[]>([]);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [mode, setMode] = useState<ResponseMode>('mentions');
  const responded = useRef(new Set<string>());
  const onExternal = useCallback((event: ExternalLiveEvent) => setEvents(current => current.some(item => item.id === event.id) ? current : [event, ...current].slice(0, 60)), []);
  const host = useHostBroadcast(liveId);
  const viewer = useViewerTransport(liveId);
  const isHost = params.host === '1' || !!room && room.hostId === user?.id;
  const ai = useSyloraRealtime({ liveId: isHost ? liveId : undefined, sharedAudioTrack: isHost ? host.localStream?.getAudioTracks()[0] : null });

  useEffect(() => {
    api.request<{ rooms: LiveRoom[] }>('/api/live').then(data => setRoom(data.rooms.find(item => item.id === liveId) || null)).catch(() => {});
  }, [liveId]);
  useEffect(() => { if (!isHost && room) viewer.start().catch(() => {}); }, [isHost, room, viewer.start]);
  useEffect(() => {
    if (!isHost || !ai.connected) return;
    const event = events[0]; if (!event || responded.current.has(event.id)) return;
    const mention = /(^|\s)(sylora|сілора|силора)(\s|[,.!?]|$)/i.test(event.text || '');
    if (mode === 'all' || mode === 'mentions' && (mention || event.type === 'gift')) {
      if (ai.respondToEvent(event)) responded.current.add(event.id);
    }
  }, [events, mode, ai.connected, ai.respondToEvent, isHost]);

  const startHost = async () => { await host.start(onExternal); };
  const issuePairing = async () => {
    try { setPairing(await api.post<Pairing>(`/api/live/${encodeURIComponent(liveId)}/connectors/tikfinity/pairings`)); }
    catch (error: any) { Alert.alert('TikFinity relay', error?.message || 'Не вдалося створити pairing.'); }
  };
  const sharePairing = async () => {
    if (!pairing) return;
    const block = `SYLORA_RELAY_BASE_URL=${api.baseUrl}\nSYLORA_RELAY_LIVE_ID=${liveId}\nSYLORA_RELAY_TOKEN=${pairing.token}\nSYLORA_TIKFINITY_URL=ws://127.0.0.1:21213`;
    await Share.share({ title: 'SYLORA TikFinity pairing', message: `Встав ці рядки у .env.local на ПК і запусти npm run companion. Не надсилай токен стороннім.\n\n${block}` });
  };
  const endLive = () => Alert.alert('Завершити LIVE?', 'Камера, Sylora та relay буде відключено.', [{ text: 'Скасувати', style: 'cancel' }, { text: 'Завершити', style: 'destructive', onPress: async () => { await api.post(`/api/live/${encodeURIComponent(liveId)}/end`); ai.stop(); host.stop(); router.replace('/(tabs)/live'); } }]);
  const voiceLabel = useMemo(() => ({ idle: 'Увімкнути Sylora', connecting: 'Підключення…', ready: 'Sylora поруч', listening: 'Sylora слухає', thinking: 'Sylora думає', speaking: 'Sylora говорить', error: 'Повторити Sylora' }[ai.state]), [ai.state]);

  if (!isHost) return (
    <SafeAreaView style={styles.stage}><LivingBackground live /><View style={styles.viewerStage}>{viewer.remoteStream ? <RTCView streamURL={viewer.remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" /> : <View style={styles.waiting}><Text style={styles.waitingStar}>✦</Text><Text style={styles.waitingText}>{viewer.status === 'limited' ? 'Ліміт P2P глядачів' : 'Очікуємо відео ведучого…'}</Text></View>}<Pressable style={styles.back} onPress={() => router.back()}><Ionicons name="chevron-back" color="#FFF" size={24} /></Pressable><View style={styles.viewerCopy}><Text style={styles.livePill}>● LIVE</Text><Text style={styles.viewerTitle}>{room?.title || 'SYLORA LIVE'}</Text></View></View></SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.stage}>
      <LivingBackground live />
      <ScrollView contentContainerStyle={styles.hostContent}>
        <View style={styles.preview}>
          {host.localStream ? <RTCView streamURL={host.localStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror /> : <View style={styles.waiting}><Text style={styles.waitingStar}>✦</Text><Text style={styles.waitingText}>Камера ще не активна</Text></View>}
          <View style={styles.previewShade} />
          <View style={styles.topBar}><Pressable style={styles.round} onPress={() => router.back()}><Ionicons name="chevron-back" color="#FFF" size={22} /></Pressable><Text style={styles.livePill}>● {host.status === 'live' ? 'LIVE' : host.status.toUpperCase()}</Text><Pressable style={styles.round} onPress={endLive}><Ionicons name="close" color="#FFF" size={22} /></Pressable></View>
          <View style={styles.previewCopy}><Text style={styles.previewTitle}>{room?.title || 'SYLORA LIVE'}</Text><Text style={styles.previewMeta}>{host.peerCount} глядачів у WebRTC · {events.length} зовнішніх подій</Text></View>
          <View style={styles.cameraControls}><Pressable style={styles.round} onPress={host.toggleMute}><Ionicons name="mic-outline" color="#FFF" size={22} /></Pressable><Pressable style={styles.round} onPress={host.switchCamera}><Ionicons name="camera-reverse-outline" color="#FFF" size={22} /></Pressable></View>
        </View>
        {!host.localStream ? <LivingButton kind="live" label="Дозволити камеру й почати LIVE" onPress={() => startHost().catch(error => Alert.alert('Камера / LIVE', error.message))} /> : null}
        <GlassCard style={styles.aiCard}>
          <View style={styles.aiHead}><View style={[styles.aiOrb, ai.connected && styles.aiOrbOn]}><Text>✦</Text></View><View style={{ flex: 1 }}><Text style={styles.aiName}>Sylora co-host</Text><Text style={styles.aiState}>{voiceLabel}</Text></View><Text style={styles.voiceBadge}>MARIN · REALTIME</Text></View>
          <Text style={styles.aiCopy}>Говорить із ведучим природно та реагує на дозволені події чату. Не видає себе за людину й не надсилає повідомлення в TikTok.</Text>
          <LivingButton kind={ai.connected ? 'pearl' : 'metal'} label={ai.connected ? 'Завершити голос' : voiceLabel} disabled={!host.localStream || ai.state === 'connecting'} onPress={() => ai.connected ? ai.stop() : ai.start().catch(error => Alert.alert('Sylora voice', error.message))} />
          {ai.lastTranscript ? <Text style={styles.transcript}>“{ai.lastTranscript}”</Text> : null}
          {ai.remoteStream ? <RTCView streamURL={ai.remoteStream.toURL()} style={styles.audioRoute} objectFit="contain" /> : null}
        </GlassCard>
        <GlassCard style={styles.relayCard}>
          <Text style={styles.cardEyebrow}>TIKTOK LIVE · OWNER RELAY</Text><Text style={styles.cardTitle}>TikFinity → Sylora на телефоні</Text>
          <Text style={styles.cardCopy}>TikFinity Desktop працює на ПК. Companion пересилає лише chat/gift/guest події через одноразовий токен цього LIVE.</Text>
          {!pairing ? <LivingButton kind="pearl" label="Створити pairing для ПК" onPress={issuePairing} /> : <><View style={styles.tokenBox}><Text style={styles.tokenLabel}>ОДНОРАЗОВИЙ ТОКЕН · ДО {new Date(pairing.pairing.expiresAt).toLocaleTimeString()}</Text><Text selectable numberOfLines={2} style={styles.token}>{pairing.token}</Text></View><LivingButton label="Передати налаштування на свій ПК" onPress={sharePairing} /></>}
        </GlassCard>
        <GlassCard style={styles.eventsCard}>
          <View style={styles.modeRow}>{(['manual', 'mentions', 'all'] as ResponseMode[]).map(value => <Pressable key={value} onPress={() => setMode(value)} style={[styles.mode, mode === value && styles.modeActive]}><Text style={[styles.modeText, mode === value && styles.modeTextActive]}>{value === 'manual' ? 'Вручну' : value === 'mentions' ? 'Згадки + gifts' : 'Усе'}</Text></Pressable>)}</View>
          <Text style={styles.cardTitle}>Живі події</Text>
          {events.map(event => <View key={event.id} style={styles.event}><View style={[styles.eventDot, event.type === 'gift' && { backgroundColor: colors.champagne }]} /><Text style={styles.eventText}>{eventText(event)}</Text><Pressable disabled={!ai.connected} onPress={() => { if (ai.respondToEvent(event)) responded.current.add(event.id); }}><Text style={[styles.reply, !ai.connected && { opacity: 0.35 }]}>Озвучити</Text></Pressable></View>)}
          {!events.length ? <Text style={styles.emptyEvents}>Після підключення TikFinity тут з’являться chat, gifts і guest events.</Text> : null}
        </GlassCard>
        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: colors.void }, hostContent: { padding: 14, gap: 13 },
  preview: { height: 500, borderRadius: 34, overflow: 'hidden', backgroundColor: '#16141D' }, previewShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(5,4,8,0.1)' },
  waiting: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 10 }, waitingStar: { color: colors.champagneSoft, fontSize: 74 }, waitingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  topBar: { position: 'absolute', top: 15, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, round: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,14,21,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  livePill: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1, backgroundColor: colors.live, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' },
  previewCopy: { position: 'absolute', left: 18, right: 18, bottom: 22 }, previewTitle: { color: '#FFF', fontSize: 30, fontWeight: '700' }, previewMeta: { color: 'rgba(255,255,255,0.7)', marginTop: 5 },
  cameraControls: { position: 'absolute', right: 14, bottom: 78, gap: 10 },
  aiCard: { gap: 13 }, aiHead: { flexDirection: 'row', alignItems: 'center', gap: 12 }, aiOrb: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4DDD3' }, aiOrbOn: { backgroundColor: '#CFC3F3', shadowColor: colors.violet, shadowOpacity: 0.45, shadowRadius: 15 }, aiName: { color: colors.ink, fontSize: 17, fontWeight: '800' }, aiState: { color: colors.violet, fontSize: 12, fontWeight: '700', marginTop: 3 }, voiceBadge: { color: colors.muted, fontSize: 9, fontWeight: '900' }, aiCopy: { color: colors.muted, lineHeight: 20 }, transcript: { color: colors.ink, fontStyle: 'italic', lineHeight: 20 }, audioRoute: { width: 1, height: 1, opacity: 0.01 },
  relayCard: { gap: 12 }, cardEyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, cardTitle: { color: colors.ink, fontSize: 22, fontWeight: '700' }, cardCopy: { color: colors.muted, lineHeight: 20 }, tokenBox: { backgroundColor: '#EEE8DF', borderRadius: radii.medium, padding: 13 }, tokenLabel: { color: colors.warning, fontSize: 9, fontWeight: '900' }, token: { color: colors.ink, fontSize: 11, marginTop: 7 },
  eventsCard: { gap: 12 }, modeRow: { flexDirection: 'row', gap: 7 }, mode: { flex: 1, borderRadius: radii.pill, paddingVertical: 8, alignItems: 'center', backgroundColor: '#EEE9E2' }, modeActive: { backgroundColor: colors.metal }, modeText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, modeTextActive: { color: '#FFF' },
  event: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 11 }, eventDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: colors.live }, eventText: { flex: 1, color: colors.ink, fontSize: 13 }, reply: { color: colors.violet, fontSize: 11, fontWeight: '900' }, emptyEvents: { color: colors.muted, lineHeight: 20 },
  viewerStage: { flex: 1, backgroundColor: '#111018' }, back: { position: 'absolute', top: 15, left: 14, width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }, viewerCopy: { position: 'absolute', left: 18, right: 18, bottom: 32, gap: 10 }, viewerTitle: { color: '#FFF', fontSize: 30, fontWeight: '800' }
});
