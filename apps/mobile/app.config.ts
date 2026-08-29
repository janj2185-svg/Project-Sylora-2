import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'SYLORA',
  slug: 'sylora-mobile',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'sylora',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  experiments: { typedRoutes: true },
  plugins: [
    'expo-router',
    ['expo-secure-store', { configureAndroidBackup: true }],
    '@config-plugins/react-native-webrtc',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7F3EC',
        image: '../../public/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png',
        imageWidth: 300,
        resizeMode: 'contain'
      }
    ]
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'world.sylora.mobile',
    infoPlist: {
      NSCameraUsageDescription: 'SYLORA використовує камеру лише коли ви створюєте відео або запускаєте LIVE.',
      NSMicrophoneUsageDescription: 'SYLORA використовує мікрофон для LIVE та живої голосової розмови із Sylora AI.'
    }
  },
  android: {
    package: 'world.sylora.mobile',
    permissions: ['CAMERA', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS']
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_SYLORA_API_URL || '',
    eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined }
  }
};

export default config;
