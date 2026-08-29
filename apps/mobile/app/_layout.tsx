import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/auth';
import { I18nProvider } from '@/i18n';

export default function RootLayout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="live/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="video/[id]" />
          <Stack.Screen name="profile/[username]" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="gift/[id]" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
    </I18nProvider>
  );
}
