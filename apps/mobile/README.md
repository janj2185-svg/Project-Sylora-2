# SYLORA Mobile — Android + iOS

Native Expo/React Native client for the existing SYLORA API. It is a development-build app, not an Expo Go mock: `react-native-webrtc` supplies camera, microphone, host/viewer LIVE transport, and the OpenAI Realtime audio peer.

## Included vertical slice

- Stable `Home / LIVE / Sylora / Inbox / Profile` navigation and `sylora://` deep-link scheme.
- Full canonical 1100×650 logo rendered with `contain`; the symbol, wordmark and slogan are never cropped or redrawn.
- Living Horizon PEARL/FROST/CRYSTAL/METAL surfaces, reduced-motion-aware semantic scenes for Home, LIVE, Sylora, Inbox, Profile and Studio, haptics and live control states. VOID is limited to LIVE.
- Login/registration with session tokens stored in iOS Keychain / Android Keystore through SecureStore.
- Instant clip player with the next item prepared by a second `expo-video` player.
- Native host camera/microphone preview, WebRTC signaling, viewer playback, mute, camera switch and LIVE termination.
- OpenAI Realtime voice through `/api/ai/realtime`; the standard API key stays on the server.
- Owner-scoped TikFinity relay journal with manual, mention/gift, or all-event Sylora response modes.
- Interactive creator connection hub for TikTok owner relay, YouTube stream keys, local OBS control, TikFinity pairing and RTMP(S) distribution. It reads actual router/destination readiness and never displays an unconfigured provider as connected.
- Five visible interface locales in Profile: Ukrainian, English, Polish, German and Russian. The preference is stored securely and synchronized to `/api/me`.

## Run locally

The API must be running first from the repository root:

```bash
npm ci
npm run dev
```

Then create a native development build:

```bash
cd apps/mobile
npm ci
npx expo prebuild
npm run android
```

On macOS, use `npm run ios` for iPhone/iPad. Expo Go cannot load the WebRTC native module.

Android Emulator defaults to `http://10.0.2.2:8787`; iOS Simulator defaults to `http://127.0.0.1:8787`. A physical device or production build needs a reachable HTTPS API:

```env
EXPO_PUBLIC_SYLORA_API_URL=https://api.example.com
```

## TikFinity owner relay

1. Start a SYLORA LIVE on the phone and enable the camera.
2. In the TikFinity card, create a pairing. Its token is visible once and expires after two hours.
3. On the creator's PC, install and run TikFinity Desktop. Its local WebSocket remains `ws://127.0.0.1:21213`.
4. Put the four values shared by the phone into the repository root `.env.local` on that PC, then run `npm run companion`.
5. The companion validates the token against the selected LIVE before forwarding normalized events. The token remains only in process memory and is revoked when the LIVE ends or the server restarts.

This is not a TikTok private API. Official TikTok Login Kit / Content Posting access and a creator stream key still require a registered, reviewed TikTok developer app. Realtime TikTok LIVE chat/gifts use the creator-owned TikFinity Desktop bridge.

## Release gates still requiring owner accounts

- Android signing keystore / Google Play Console.
- Apple Developer Team, provisioning profiles and App Store Connect.
- Public HTTPS API and TURN credentials for reliable mobile networks.
- TikTok Client Key/Secret + approved redirect links for Login Kit.
- Platform stream keys or approved publishing permissions for external RTMP(S) destinations.
- A square owner-approved app-store icon derived through the brand review process. The canonical horizontal logo is deliberately not auto-cropped into an icon.
