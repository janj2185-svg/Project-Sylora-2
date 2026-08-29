import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { GlassCard } from '@/components/GlassCard';
import { LivingBackground } from '@/components/LivingBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme';
import type { AccountUser } from '@/types';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>(); const [profile, setProfile] = useState<AccountUser | null>(null);
  useEffect(() => { api.request<{ users: AccountUser[] }>('/api/users').then(data => setProfile(data.users.find(user => user.username === username) || null)).catch(() => {}); }, [username]);
  return <SafeAreaView style={styles.safe}><LivingBackground /><ScrollView contentContainerStyle={styles.content}><ScreenHeader title={`@${username}`} /><GlassCard style={styles.profile}><View style={styles.avatar}><Text>{profile?.displayName?.[0] || 'S'}</Text></View><Text style={styles.name}>{profile?.displayName || 'Профіль'}</Text><Text style={styles.username}>@{username}</Text><Text style={styles.bio}>{profile?.bio || 'SYLORA creator'}</Text></GlassCard></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.pearl }, content: { padding: 16, gap: 15 }, profile: { alignItems: 'center', gap: 7, paddingVertical: 34 }, avatar: { width: 96, height: 96, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4DBCF' }, name: { color: colors.ink, fontSize: 28, fontWeight: '800' }, username: { color: colors.champagne, fontWeight: '800' }, bio: { color: colors.muted, textAlign: 'center', marginTop: 8 } });
