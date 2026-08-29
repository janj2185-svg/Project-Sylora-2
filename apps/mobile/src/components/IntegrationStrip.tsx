import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme';

const services = [
  { name: 'TikTok', tone: '#F24D87' },
  { name: 'YouTube', tone: '#E54242' },
  { name: 'OBS', tone: '#5A5562' },
  { name: 'TikFinity', tone: '#7A61CE' },
  { name: 'RTMP(S)', tone: '#3D9C9B' }
];

export function IntegrationStrip() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {services.map(service => <View key={service.name} style={styles.pill}><View style={[styles.dot, { backgroundColor: service.tone }]} /><Text style={styles.label}>{service.name}</Text></View>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 9, paddingRight: 18 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radii.pill, backgroundColor: colors.frost, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 13, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 5 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '800' }
});
