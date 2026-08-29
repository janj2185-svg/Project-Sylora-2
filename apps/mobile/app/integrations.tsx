import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api';
import { GlassCard } from '@/components/GlassCard';
import { LivingBackground } from '@/components/LivingBackground';
import { LivingButton } from '@/components/LivingButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useI18n } from '@/i18n';
import { colors, radii } from '@/theme';

type DistributionStatus = {
  destinations: Array<{ id: string; provider: string; label?: string; enabled?: boolean }>;
  configuration: { configured: boolean; status: string; maxDestinations: number };
};

const serviceDefinitions = [
  { id: 'tiktok', name: 'TikTok', code: 'OWNER RELAY', note: 'ownerRelayNote', tone: '#F24D87' },
  { id: 'youtube', name: 'YouTube', code: 'STREAM KEY', note: 'youtubeNote', tone: '#E54242' },
  { id: 'obs', name: 'OBS', code: 'LOCAL', note: 'obsNote', tone: '#5A5562' },
  { id: 'tikfinity', name: 'TikFinity', code: 'PAIR IN LIVE', note: 'tikfinityNote', tone: '#7A61CE' },
  { id: 'rtmp', name: 'RTMP(S)', code: 'MULTISTREAM', note: 'rtmpNote', tone: '#3D9C9B' }
] as const;

export default function IntegrationsScreen() {
  const { service } = useLocalSearchParams<{ service?: string }>();
  const { t } = useI18n();
  const [distribution, setDistribution] = useState<DistributionStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const result = await api.request<DistributionStatus>('/api/studio/distribution').catch(() => null);
    setDistribution(result);
  };
  useEffect(() => { load(); }, []);

  const configuredProviders = useMemo(() => new Set((distribution?.destinations || []).filter(item => item.enabled !== false).map(item => item.provider)), [distribution]);
  const ready = (id: string) => {
    if (id === 'tiktok' || id === 'tikfinity' || id === 'obs') return true;
    if (id === 'youtube') return configuredProviders.has('youtube');
    return distribution?.configuration?.configured === true;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LivingBackground variant="studio" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <ScreenHeader title={t('streamConnections')} />
        <GlassCard style={styles.hero}>
          <Text style={styles.eyebrow}>SYLORA CREATOR NETWORK</Text>
          <Text style={styles.title}>{t('streamConnections')}</Text>
          <Text style={styles.copy}>{t('connectionsHint')}</Text>
          <View style={styles.readout}>
            <View><Text style={styles.readoutLabel}>{t('configuredDestinations').toUpperCase()}</Text><Text style={styles.readoutValue}>{distribution?.destinations?.length || 0}</Text></View>
            <View><Text style={styles.readoutLabel}>RTMP(S) ROUTER</Text><Text style={styles.readoutValueSmall}>{distribution?.configuration?.status || 'NOT CONFIGURED'}</Text></View>
          </View>
        </GlassCard>

        <View style={styles.services}>
          {serviceDefinitions.map(item => {
            const isReady = ready(item.id);
            const selected = service === item.id;
            return (
              <Pressable key={item.id} onPress={() => router.setParams({ service: item.id })} accessibilityRole="button">
                <GlassCard style={[styles.service, selected && { borderColor: item.tone, shadowColor: item.tone, shadowOpacity: 0.18 }]}>
                  <View style={[styles.serviceMark, { backgroundColor: `${item.tone}18`, borderColor: `${item.tone}35` }]}><View style={[styles.dot, { backgroundColor: item.tone, shadowColor: item.tone }]} /><Text style={[styles.markText, { color: item.tone }]}>{item.name.slice(0, 2).toUpperCase()}</Text></View>
                  <View style={styles.serviceCopy}><View style={styles.serviceTitleRow}><Text style={styles.serviceTitle}>{item.name}</Text><Text style={[styles.status, { color: isReady ? colors.success : colors.warning }]}>{isReady ? t('available').toUpperCase() : t('needsSetup').toUpperCase()}</Text></View><Text style={styles.serviceCode}>{item.code}</Text><Text style={styles.serviceNote}>{t(item.note)}</Text></View>
                  <Text style={[styles.chevron, { color: item.tone }]}>›</Text>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>

        <LivingButton label={t('openLive')} onPress={() => router.replace('/(tabs)/live')} />
        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pearl },
  content: { paddingHorizontal: 17, paddingBottom: 28, gap: 14 },
  hero: { gap: 10, overflow: 'hidden' },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 38, fontWeight: '700', letterSpacing: -1.1 },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  readout: { flexDirection: 'row', gap: 8, marginTop: 5 },
  readoutLabel: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  readoutValue: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 4 },
  readoutValueSmall: { color: colors.ink, fontSize: 11, fontWeight: '900', marginTop: 8 },
  services: { gap: 10 },
  service: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.large },
  serviceMark: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 6, shadowOpacity: 0.35, shadowRadius: 6 },
  markText: { fontSize: 9, fontWeight: '900' },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  serviceTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  status: { fontSize: 7, fontWeight: '900', letterSpacing: 0.6, textAlign: 'right' },
  serviceCode: { color: colors.champagne, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginTop: 3 },
  serviceNote: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 6 },
  chevron: { fontSize: 28, lineHeight: 30 }
});
