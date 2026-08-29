import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { GlassCard } from '@/components/GlassCard';
import { IntegrationStrip } from '@/components/IntegrationStrip';
import { LivingBackground } from '@/components/LivingBackground';
import { LivingButton } from '@/components/LivingButton';
import { localeLabels, locales, useI18n } from '@/i18n';
import { colors, radii } from '@/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useI18n();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}><LivingBackground /><ScrollView contentContainerStyle={styles.content}>
      <BrandLogo width={170} />
      <GlassCard style={styles.identity}><View style={styles.avatar}><Text>{user?.displayName?.[0] || 'S'}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{user?.displayName}</Text><Text style={styles.username}>@{user?.username}</Text></View><Text style={styles.pro}>PRO</Text></GlassCard>
      <GlassCard style={styles.section}><Text style={styles.eyebrow}>{t('settings').toUpperCase()}</Text><Text style={styles.title}>{t('language')}</Text><View style={styles.languages}>{locales.map(item => <Pressable key={item} onPress={() => { setLocale(item); api.request('/api/me', { method: 'PATCH', body: JSON.stringify({ locale: item }) }).catch(() => {}); }} style={[styles.language, item === locale && styles.languageActive]}><Text style={[styles.languageText, item === locale && styles.languageTextActive]}>{localeLabels[item]}</Text></Pressable>)}</View></GlassCard>
      <GlassCard style={styles.section}><Text style={styles.eyebrow}>{t('integrations').toUpperCase()}</Text><Text style={styles.title}>Платформи й Studio</Text><IntegrationStrip /><Text style={styles.note}>TikTok Login Kit і publishing потребують окремого схвалення застосунку. LIVE chat/gifts працюють через локальний TikFinity companion власника.</Text></GlassCard>
      <GlassCard style={styles.section}><Text style={styles.eyebrow}>PRIVACY & AI CONTROL</Text><Text style={styles.title}>Ти вирішуєш, що пам’ятати.</Text><Text style={styles.note}>Секрети, паролі та API-ключі ніколи не зберігаються в пам’яті Sylora.</Text></GlassCard>
      <LivingButton kind="pearl" label={t('logout')} onPress={async () => { await logout(); router.replace('/auth'); }} />
      <View style={{ height: 110 }} />
    </ScrollView></SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.pearl }, content: { alignItems: 'center', padding: 18, gap: 15 }, identity: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 13 }, avatar: { width: 64, height: 64, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DFD5C7' }, name: { color: colors.ink, fontSize: 21, fontWeight: '800' }, username: { color: colors.muted, marginTop: 4 }, pro: { color: colors.champagne, fontSize: 10, fontWeight: '900' }, section: { width: '100%', gap: 12 }, eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 }, title: { color: colors.ink, fontSize: 23, fontWeight: '700' }, languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, language: { borderRadius: radii.pill, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#EDE7DF' }, languageActive: { backgroundColor: colors.metal }, languageText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, languageTextActive: { color: '#FFF' }, note: { color: colors.muted, lineHeight: 20 } });
