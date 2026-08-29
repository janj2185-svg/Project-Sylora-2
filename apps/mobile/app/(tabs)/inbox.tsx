import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { GlassCard } from '@/components/GlassCard';
import { LivingBackground } from '@/components/LivingBackground';
import { SectionTitle } from '@/components/SectionTitle';
import { colors } from '@/theme';

type Conversation = { id: string; members?: Array<{ id: string; username: string; displayName: string }>; lastMessage?: { text: string; createdAt: string } };

export default function InboxScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  useEffect(() => { api.request<{ conversations: Conversation[] }>('/api/conversations').then(data => setConversations(data.conversations)).catch(() => {}); }, []);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}><LivingBackground /><ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}><Text style={styles.eyebrow}>INTELLIGENT INBOX</Text><Text style={styles.title}>Важливе не губиться.</Text><Text style={styles.copy}>Повідомлення, LIVE-дзвінки й сповіщення зберігають один контекст.</Text></View>
      <SectionTitle eyebrow="MESSAGES" title="Розмови" />
      <GlassCard style={styles.list}>
        {conversations.map(conversation => { const member = conversation.members?.[0]; return <Pressable key={conversation.id} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: conversation.id } })} style={styles.row}><View style={styles.avatar}><Text>{(member?.displayName || 'S')[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{member?.displayName || 'SYLORA conversation'}</Text><Text numberOfLines={1} style={styles.preview}>{conversation.lastMessage?.text || 'Відкрити приватну розмову'}</Text></View><Text style={styles.arrow}>›</Text></Pressable> })}
        {!conversations.length ? <Text style={styles.empty}>Inbox чистий. Нові повідомлення з’являться тут.</Text> : null}
      </GlassCard><View style={{ height: 110 }} />
    </ScrollView></SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.pearl }, content: { padding: 18, gap: 18 }, hero: { minHeight: 220, justifyContent: 'flex-end', gap: 8 }, eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 }, title: { color: colors.ink, fontSize: 40, lineHeight: 44, fontWeight: '700' }, copy: { color: colors.muted, lineHeight: 21 }, list: { gap: 2 }, row: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line }, avatar: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8E0D5' }, name: { color: colors.ink, fontWeight: '800' }, preview: { color: colors.muted, fontSize: 12, marginTop: 4 }, arrow: { color: colors.champagne, fontSize: 27 }, empty: { color: colors.muted, lineHeight: 20 } });
