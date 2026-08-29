import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { GlassCard } from '@/components/GlassCard';
import { LivingBackground } from '@/components/LivingBackground';
import { LivingButton } from '@/components/LivingButton';
import { useSyloraRealtime } from '@/live/useSyloraRealtime';
import { colors, radii } from '@/theme';

type Message = { id?: string; role: 'user' | 'assistant'; text: string };

export default function SyloraScreen() {
  const voice = useSyloraRealtime();
  const pulse = useRef(new Animated.Value(0)).current;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: voice.state === 'speaking' ? 550 : 2_200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: voice.state === 'speaking' ? 550 : 2_200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ])); loop.start(); return () => loop.stop();
  }, [pulse, voice.state]);
  useEffect(() => { api.request<{ messages: Message[] }>('/api/ai/history').then(result => setMessages(result.messages || [])).catch(() => {}); }, []);
  const send = async () => {
    const clean = text.trim(); if (!clean) return; setText(''); setBusy(true); setMessages(current => [...current, { role: 'user', text: clean }]);
    try { const result = await api.post<{ message: string }>('/api/ai/chat', { text: clean, view: 'command_center' }); setMessages(current => [...current, { role: 'assistant', text: result.message }]); }
    catch (error: any) { setMessages(current => [...current, { role: 'assistant', text: error?.message === 'AI_PROVIDER_NOT_CONFIGURED' ? 'OpenAI ще не підключено до цього сервера.' : 'Зв’язок обірвався. Спробуй ще раз.' }]); }
    finally { setBusy(false); }
  };
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, voice.state === 'speaking' ? 1.12 : 1.035] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.62] });
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LivingBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Animated.View style={[styles.aura, { opacity, transform: [{ scale }] }]} />
            <Animated.View style={[styles.orb, { transform: [{ scale }] }]}><Text style={styles.orbMark}>✦</Text></Animated.View>
            <Text style={styles.presence}>SYLORA · {voice.state.toUpperCase()}</Text>
            <Text style={styles.title}>Я поруч.</Text>
            <Text style={styles.subtitle}>Не перекриваю твій світ. З’являюся, коли ти говориш або кличеш мене.</Text>
            <LivingButton label={voice.connected ? 'Завершити живу розмову' : voice.state === 'connecting' ? 'Підключення…' : 'Почати живу розмову'} disabled={voice.state === 'connecting'} onPress={() => voice.connected ? voice.stop() : voice.start().catch(() => {})} />
            {voice.remoteStream ? <RTCView streamURL={voice.remoteStream.toURL()} style={styles.audioRoute} objectFit="contain" /> : null}
            {voice.lastTranscript ? <Text style={styles.liveCaption}>Sylora: {voice.lastTranscript}</Text> : null}
          </View>
          <GlassCard style={styles.dialogue}>
            <Text style={styles.section}>РОЗМОВА · ОДНА ПАМ’ЯТЬ</Text>
            {messages.slice(-8).map((message, index) => <View key={message.id || `${message.role}-${index}`} style={[styles.bubble, message.role === 'user' ? styles.mine : styles.sylora]}><Text style={styles.bubbleLabel}>{message.role === 'user' ? 'ТИ' : 'SYLORA'}</Text><Text style={styles.bubbleText}>{message.text}</Text></View>)}
            {!messages.length ? <Text style={styles.empty}>Можеш говорити голосом або написати. Sylora відповідає мовою розмови.</Text> : null}
          </GlassCard>
          <GlassCard style={styles.compose}>
            <TextInput value={text} onChangeText={setText} placeholder="Поговорити із Sylora…" placeholderTextColor="#8B858E" multiline style={styles.input} />
            <LivingButton label={busy ? 'Думаю…' : 'Надіслати'} disabled={busy || !text.trim()} onPress={send} />
          </GlassCard>
          <View style={{ height: 110 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pearl }, content: { padding: 17, gap: 14 },
  hero: { minHeight: 500, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 10 }, aura: { position: 'absolute', width: 250, height: 250, borderRadius: 140, backgroundColor: '#C9B9F3' }, orb: { width: 154, height: 154, borderRadius: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#FFF', shadowColor: colors.violet, shadowOpacity: 0.22, shadowRadius: 30 }, orbMark: { fontSize: 67, color: colors.ink },
  presence: { marginTop: 18, color: colors.violet, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 }, title: { color: colors.ink, fontSize: 45, fontWeight: '700' }, subtitle: { color: colors.muted, textAlign: 'center', lineHeight: 21, maxWidth: 330, marginBottom: 8 }, audioRoute: { width: 1, height: 1, opacity: 0.01 }, liveCaption: { color: colors.ink, textAlign: 'center', fontStyle: 'italic', marginTop: 5 },
  dialogue: { gap: 10 }, section: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, bubble: { maxWidth: '88%', borderRadius: radii.medium, padding: 13 }, mine: { alignSelf: 'flex-end', backgroundColor: '#E7E0D6' }, sylora: { alignSelf: 'flex-start', backgroundColor: '#ECE7F7' }, bubbleLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', marginBottom: 5 }, bubbleText: { color: colors.ink, lineHeight: 20 }, empty: { color: colors.muted, lineHeight: 20 }, compose: { gap: 10 }, input: { minHeight: 90, textAlignVertical: 'top', color: colors.ink, fontSize: 15, lineHeight: 21, borderRadius: radii.medium, backgroundColor: 'rgba(255,255,255,0.75)', padding: 14 }
});
