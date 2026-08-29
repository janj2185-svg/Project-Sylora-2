import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { LivingBackground } from '@/components/LivingBackground';
import { LivingButton } from '@/components/LivingButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radii } from '@/theme';

type Message = { id: string; userId: string; text: string; createdAt: string };

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const conversationId = String(id);
  const { user } = useAuth(); const [messages, setMessages] = useState<Message[]>([]); const [text, setText] = useState('');
  const load = useCallback(() => api.request<{ messages: Message[] }>(`/api/conversations/${encodeURIComponent(conversationId)}/messages`).then(data => setMessages(data.messages)), [conversationId]);
  useEffect(() => { load().catch(() => {}); const timer = setInterval(() => load().catch(() => {}), 3_000); return () => clearInterval(timer); }, [load]);
  const send = async () => { const clean = text.trim(); if (!clean) return; setText(''); await api.post(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, { text: clean }); await load(); };
  return <SafeAreaView style={styles.safe}><LivingBackground /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.content}><ScreenHeader title="Приватна розмова" /><ScrollView contentContainerStyle={styles.messages}>{messages.map(message => { const mine = message.userId === user?.id; return <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={[styles.text, !mine && styles.theirText]}>{message.text}</Text></View>; })}{!messages.length ? <Text style={styles.empty}>Почни розмову.</Text> : null}</ScrollView><View style={styles.compose}><TextInput value={text} onChangeText={setText} placeholder="Написати…" style={styles.input} /><LivingButton label="↑" disabled={!text.trim()} onPress={send} style={styles.send} /></View></View></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.pearl }, content: { flex: 1, paddingHorizontal: 15 }, messages: { flexGrow: 1, justifyContent: 'flex-end', gap: 8, paddingVertical: 12 }, bubble: { maxWidth: '83%', padding: 13, borderRadius: radii.medium }, mine: { alignSelf: 'flex-end', backgroundColor: colors.metal }, theirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.86)' }, text: { color: '#FFF', lineHeight: 20 }, theirText: { color: colors.ink }, empty: { color: colors.muted, textAlign: 'center' }, compose: { flexDirection: 'row', gap: 8, paddingBottom: 8 }, input: { flex: 1, minHeight: 52, borderRadius: radii.medium, backgroundColor: '#FFF', paddingHorizontal: 15, color: colors.ink }, send: { width: 58 } });
