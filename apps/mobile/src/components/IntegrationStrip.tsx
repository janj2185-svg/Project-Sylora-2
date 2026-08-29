import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radii } from '../theme';

const services = [
  { id: 'tiktok', name: 'TikTok', status: 'OWNER RELAY', tone: '#F24D87' },
  { id: 'youtube', name: 'YouTube', status: 'STREAM KEY', tone: '#E54242' },
  { id: 'obs', name: 'OBS', status: 'LOCAL', tone: '#5A5562' },
  { id: 'tikfinity', name: 'TikFinity', status: 'COMPANION', tone: '#7A61CE' },
  { id: 'rtmp', name: 'RTMP(S)', status: 'ROUTER', tone: '#3D9C9B' }
];

export function IntegrationStrip() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {services.map(service => (
        <Pressable
          key={service.id}
          accessibilityRole="button"
          accessibilityLabel={`${service.name} · ${service.status}`}
          onPress={() => router.push({ pathname: '/integrations', params: { service: service.id } })}
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        >
          <View style={[styles.dot, { backgroundColor: service.tone, shadowColor: service.tone }]} />
          <View><Text style={styles.label}>{service.name}</Text><Text style={styles.status}>{service.status}</Text></View>
          <Text style={[styles.arrow, { color: service.tone }]}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 9, paddingRight: 18 },
  pill: { minWidth: 142, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radii.large, backgroundColor: colors.frost, borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 13, paddingVertical: 9, shadowColor: '#344342', shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  pressed: { transform: [{ translateY: 1 }, { scale: 0.985 }], opacity: 0.9 },
  dot: { width: 10, height: 10, borderRadius: 8, shadowOpacity: 0.32, shadowRadius: 6 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  status: { color: colors.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 3 },
  arrow: { marginLeft: 'auto', fontSize: 21, lineHeight: 22, fontWeight: '500' }
});
