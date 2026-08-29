import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth';
import { ApiError } from '@/api';
import { BrandLogo } from '@/components/BrandLogo';
import { GlassCard } from '@/components/GlassCard';
import { LivingBackground } from '@/components/LivingBackground';
import { LivingButton } from '@/components/LivingButton';
import { colors, radii } from '@/theme';

const errors: Record<string, string> = {
  INVALID_CREDENTIALS: 'Неправильна пошта, ім’я або пароль.',
  INVALID_EMAIL: 'Перевір адресу електронної пошти.',
  WEAK_PASSWORD: 'Пароль має містити щонайменше 8 символів.',
  USERNAME_TAKEN: 'Це ім’я вже зайняте.',
  EMAIL_TAKEN: 'Ця пошта вже використовується.'
};

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identity, setIdentity] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true); setError('');
    try {
      if (mode === 'login') await login(identity, password);
      else await register(email, username, password);
      router.replace('/(tabs)/home');
    } catch (reason) {
      const code = reason instanceof ApiError ? reason.code : 'NETWORK_ERROR';
      setError(errors[code] || 'Не вдалося підключитися. Перевір адресу сервера та інтернет.');
    } finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.safe}>
      <LivingBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandLogo width={250} />
          <GlassCard style={styles.card}>
            <Text style={styles.eyebrow}>LIVING HORIZON</Text>
            <Text style={styles.title}>{mode === 'login' ? 'Раді бачити знову.' : 'Створи свій простір.'}</Text>
            <Text style={styles.description}>Один акаунт для LIVE, Studio, Sylora AI, Inbox і Wallet.</Text>
            {mode === 'login' ? (
              <TextInput value={identity} onChangeText={setIdentity} placeholder="Пошта або ім’я" autoCapitalize="none" style={styles.input} />
            ) : <>
              <TextInput value={email} onChangeText={setEmail} placeholder="Електронна пошта" keyboardType="email-address" autoCapitalize="none" style={styles.input} />
              <TextInput value={username} onChangeText={setUsername} placeholder="Ім’я користувача" autoCapitalize="none" style={styles.input} />
            </>}
            <TextInput value={password} onChangeText={setPassword} placeholder="Пароль" secureTextEntry style={styles.input} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {busy ? <ActivityIndicator color={colors.champagne} /> : <LivingButton label={mode === 'login' ? 'Увійти' : 'Створити акаунт'} onPress={submit} />}
            <LivingButton kind="pearl" label={mode === 'login' ? 'Я ще не маю акаунта' : 'У мене вже є акаунт'} onPress={() => setMode(mode === 'login' ? 'register' : 'login')} />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: colors.pearl },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 2 },
  card: { width: '100%', gap: 13 },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 4 },
  input: { minHeight: 52, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.84)', paddingHorizontal: 16, color: colors.ink, fontSize: 15 },
  error: { color: colors.danger, fontSize: 13 }
});
