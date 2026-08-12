# SYLORA Full QA Audit

- Branch tip audited at runtime against `http://127.0.0.1:8787`
- Generated: 2026-08-12T13:33:22.362Z
- QA user: `qa1451761` / `qa1786541451761@sylora-qa.test`

## Counts

- **WORKING:** 33
- **PARTIAL:** 0
- **MOCK:** 0
- **NOT_IMPLEMENTED:** 0
- **BLOCKED_EXTERNAL:** 10
- **FAILED:** 0

## Matrix

| ID | Status | Note |
|---|---|---|
| `auth.register` | WORKING | qa1786541451761@sylora-qa.test |
| `api.ready` | WORKING | {"ready":true,"dependencies":{"ready":true,"postgres":{"configured":false,"ok":true},"redis":{"configured":false,"ok":tr |
| `api.me` | WORKING | status=200 |
| `api.posts.create` | WORKING | status=201 |
| `api.wallet` | WORKING | status=200 |
| `api.live` | WORKING | status=200 |
| `live.commandCenter.api` | WORKING | ai=AI_CONFIGURATION_REQUIRED; fakeConnected=0 |
| `live.aiCohost` | BLOCKED_EXTERNAL | aiState=AI_CONFIGURATION_REQUIRED |
| `live.platform.tiktok` | BLOCKED_EXTERNAL | state=AUTH_REQUIRED |
| `live.platform.youtube` | BLOCKED_EXTERNAL | state=AUTH_REQUIRED |
| `live.platform.twitch` | BLOCKED_EXTERNAL | state=AUTH_REQUIRED |
| `live.platform.facebook` | BLOCKED_EXTERNAL | state=AUTH_REQUIRED |
| `live.platform.instagram` | BLOCKED_EXTERNAL | state=UNAVAILABLE |
| `live.platform.kick` | BLOCKED_EXTERNAL | state=AUTH_REQUIRED |
| `live.platform.discord` | BLOCKED_EXTERNAL | state=AUTH_REQUIRED |
| `live.platform.custom_rtmp` | BLOCKED_EXTERNAL | state=CONFIGURATION_REQUIRED |
| `live.capabilities` | WORKING | status=200 |
| `live.unifiedChat` | WORKING | msgs=0 |
| `auth.google` | BLOCKED_EXTERNAL | status=503 |
| `api.gifts` | WORKING | status=200 |
| `auth.login` | WORKING | status=200 |
| `auth.logout` | WORKING | logout endpoint called |
| `auth.relogin` | WORKING | status=200 |
| `social.follow` | WORKING | status=200 |
| `profile.edit` | WORKING | status=200 |
| `ui.desktop.profile` | WORKING | Q
MY SYLORA · PERSONAL ORBIT
QA Auditor ★

@qa1451761 · Full QA pass

✧ ORBIT 1
 |
| `ui.desktop.messages` | WORKING | SYLORA · INBOX
Inbox

Повідомлення · Сповіщення · Запрошення · Дзвінки

Повідомл |
| `ui.desktop.studio` | WORKING | SYLORA CREATOR STUDIO
Твоя сцена.

Scenes, sources, audio, recording, WebRTC і O |
| `ui.desktop.liveStudio` | WORKING | SYLORA LIVE · COMMAND CENTER
Центр керування ефіром

Unified platforms · honest  |
| `ui.desktop.wallet` | WORKING | SYLORA WALLET · TEST LUMEN
Баланс і заробіток

LUMEN balances are TEST/DEMO econ |
| `ui.desktop.ai` | WORKING | SYLORA · gpt-5.6
Я поруч.

Sylora тимчасово недоступна. Спробуй трохи пізніше.

 |
| `ui.mobile.ai` | WORKING | SYLORA · gpt-5.6
Я поруч.

Sylora тимчасово недоступна. Спробуй трохи пізніше.

 |
| `ui.mobile.messages` | WORKING | SYLORA · INBOX
Inbox

Повідомлення · Сповіщення · Запрошення · Дзвінки

Повідомл |
| `ui.mobile.profile` | WORKING | Q
MY SYLORA · PERSONAL ORBIT
QA Auditor ★

@qa1451761 · Full QA pass

✧ ORBIT 1
 |
| `ui.mobile.liveStudio` | WORKING | SYLORA LIVE · COMMAND CENTER
Центр керування ефіром

Unified platforms · honest  |
| `ui.mobile.studio` | WORKING | SYLORA CREATOR STUDIO
Твоя сцена.

Scenes, sources, audio, recording, WebRTC і O |
| `ui.mobile.wallet` | WORKING | SYLORA WALLET · TEST LUMEN
Баланс і заробіток

LUMEN balances are TEST/DEMO econ |
| `ui.tablet.liveStudio` | WORKING | SYLORA LIVE · COMMAND CENTER
Центр керування ефіром

Unified platforms · honest  |
| `ui.tablet.profile` | WORKING | Q
MY SYLORA · PERSONAL ORBIT
QA Auditor ★

@qa1451761 · Full QA pass

✧ ORBIT 1
 |
| `ui.tablet.messages` | WORKING | SYLORA · INBOX
Inbox

Повідомлення · Сповіщення · Запрошення · Дзвінки

Повідомл |
| `ui.tablet.ai` | WORKING | SYLORA · gpt-5.6
Я поруч.

Sylora тимчасово недоступна. Спробуй трохи пізніше.

 |
| `ui.tablet.wallet` | WORKING | SYLORA WALLET · TEST LUMEN
Баланс і заробіток

LUMEN balances are TEST/DEMO econ |
| `qa.video` | WORKING | /workspace/artifacts/qa/video/SYLORA-FULL-WALKTHROUGH.webm |

## Findings

- **UI** mobile/01-home: horizontal overflow
- **UI** tablet/01-home: horizontal overflow

## Console errors (sampled)

- desktop: Failed to load resource: the server responded with a status of 401 (Unauthorized)
- desktop: Failed to load resource: the server responded with a status of 401 (Unauthorized)
- desktop: Failed to load resource: the server responded with a status of 401 (Unauthorized)

## Screenshots

- `artifacts/qa/screenshots/desktop/02-login.png`
- `artifacts/qa/screenshots/desktop/03-register.png`
- `artifacts/qa/screenshots/desktop/01-home.png`
- `artifacts/qa/screenshots/desktop/04-feed.png`
- `artifacts/qa/screenshots/desktop/05-profile.png`
- `artifacts/qa/screenshots/desktop/06-messages.png`
- `artifacts/qa/screenshots/desktop/06b-notifications.png`
- `artifacts/qa/screenshots/desktop/07-live.png`
- `artifacts/qa/screenshots/desktop/07b-live-create.png`
- `artifacts/qa/screenshots/desktop/07c-live-following.png`
- `artifacts/qa/screenshots/desktop/08-live-studio.png`
- `artifacts/qa/screenshots/desktop/09-live-command-center.png`
- `artifacts/qa/screenshots/desktop/10-live-social-connections.png`
- `artifacts/qa/screenshots/desktop/11-live-ai-host.png`
- `artifacts/qa/screenshots/desktop/12-live-chat.png`
- `artifacts/qa/screenshots/desktop/12b-live-controls.png`
- `artifacts/qa/screenshots/desktop/13-wallet.png`
- `artifacts/qa/screenshots/desktop/14-settings.png`
- `artifacts/qa/screenshots/desktop/15-gifts.png`
- `artifacts/qa/screenshots/desktop/16-ai.png`
- `artifacts/qa/screenshots/desktop/17-clips.png`
- `artifacts/qa/screenshots/desktop/18-videos.png`
- `artifacts/qa/screenshots/desktop/19-explore.png`
- `artifacts/qa/screenshots/desktop/20-communities.png`
- `artifacts/qa/screenshots/desktop/21-learning.png`
- `artifacts/qa/screenshots/desktop/22-business.png`
- `artifacts/qa/screenshots/desktop/23-security.png`
- `artifacts/qa/screenshots/desktop/24-dashboard.png`
- `artifacts/qa/screenshots/desktop/25-canvas.png`
- `artifacts/qa/screenshots/desktop/26-agents.png`
- `artifacts/qa/screenshots/desktop/27-developer.png`
- `artifacts/qa/screenshots/desktop/28-identity.png`
- `artifacts/qa/screenshots/mobile/01-home.png` ⚠️ overflow-x
- `artifacts/qa/screenshots/mobile/02-live.png`
- `artifacts/qa/screenshots/mobile/03-ai.png`
- `artifacts/qa/screenshots/mobile/04-messages.png`
- `artifacts/qa/screenshots/mobile/05-profile.png`
- `artifacts/qa/screenshots/mobile/06-live-command-center.png`
- `artifacts/qa/screenshots/mobile/06-live-command-center-platforms.png`
- `artifacts/qa/screenshots/mobile/07-live-studio.png`
- `artifacts/qa/screenshots/mobile/08-wallet.png`
- `artifacts/qa/screenshots/mobile/09-gifts.png`
- `artifacts/qa/screenshots/mobile/10-settings.png`
- `artifacts/qa/screenshots/mobile/11-explore.png`
- `artifacts/qa/screenshots/mobile/12-clips.png`
- `artifacts/qa/screenshots/tablet/01-home.png` ⚠️ overflow-x
- `artifacts/qa/screenshots/tablet/02-live.png`
- `artifacts/qa/screenshots/tablet/03-live-command-center.png`
- `artifacts/qa/screenshots/tablet/03-live-command-center-platforms.png`
- `artifacts/qa/screenshots/tablet/04-profile.png`
- `artifacts/qa/screenshots/tablet/05-messages.png`
- `artifacts/qa/screenshots/tablet/06-ai.png`
- `artifacts/qa/screenshots/tablet/07-wallet.png`
- `artifacts/qa/screenshots/tablet/08-settings.png`

## Video

- `artifacts/qa/video/SYLORA-FULL-WALKTHROUGH.webm`