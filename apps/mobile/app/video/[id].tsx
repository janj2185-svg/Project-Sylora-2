import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { InstantClip } from '@/components/InstantClip';
import { LivingBackground } from '@/components/LivingBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/theme';
import type { VideoItem } from '@/types';

export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const [video, setVideo] = useState<VideoItem | null>(null);
  useEffect(() => { api.request<{ videos: VideoItem[] }>('/api/videos').then(data => setVideo(data.videos.find(item => item.id === id) || null)).catch(() => {}); }, [id]);
  return <SafeAreaView style={styles.safe}><LivingBackground /><ScrollView contentContainerStyle={styles.content}><ScreenHeader title={video?.title || 'Відео'} />{video ? <><InstantClip video={video} /><Text style={styles.title}>{video.title}</Text><Text style={styles.author}>@{video.author?.username || 'sylora'}</Text><Text style={styles.copy}>{video.description || 'SYLORA Original'}</Text></> : <Text style={styles.copy}>Відео не знайдено або ще завантажується.</Text>}</ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.pearl }, content: { padding: 16, gap: 12 }, title: { color: colors.ink, fontSize: 29, fontWeight: '800' }, author: { color: colors.champagne, fontWeight: '800' }, copy: { color: colors.muted, lineHeight: 21 } });
