import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return <View style={styles.row}><View style={styles.copy}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text></View>{action}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  copy: { flex: 1 },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
  title: { color: colors.ink, fontSize: 25, lineHeight: 30, fontWeight: '700' }
});
