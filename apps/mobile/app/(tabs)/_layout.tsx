import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth';
import { useI18n } from '@/i18n';
import { colors } from '@/theme';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { home: 'home-outline', live: 'radio-outline', sylora: 'sparkles-outline', inbox: 'mail-outline', profile: 'person-outline' };

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return null;
  if (!user) return <Redirect href="/auth" />;
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: '#8A858D',
        tabBarStyle: { position: 'absolute', height: 78, paddingTop: 8, paddingBottom: 10, marginHorizontal: 12, marginBottom: 9, borderTopWidth: 0, borderRadius: 27, backgroundColor: 'rgba(251,249,245,0.94)', shadowColor: '#5B4A36', shadowOpacity: 0.16, shadowRadius: 22, elevation: 12 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused && route.name === 'sylora' ? 'sparkles' : icons[route.name]} color={route.name === 'live' && focused ? colors.live : color} size={focused ? size + 2 : size} />
      })}
    >
      <Tabs.Screen name="home" options={{ title: t('home') }} />
      <Tabs.Screen name="live" options={{ title: t('live') }} />
      <Tabs.Screen name="sylora" options={{ title: t('sylora') }} />
      <Tabs.Screen name="inbox" options={{ title: t('inbox') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}
