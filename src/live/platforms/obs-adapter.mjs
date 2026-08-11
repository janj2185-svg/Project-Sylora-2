import { BaseLiveAdapter } from './base-adapter.mjs';

/**
 * OBS adapter — control path is local WebSocket/Companion (already in product).
 * This adapter tracks connection honesty for the Connection Manager UI.
 */
export class ObsLiveAdapter extends BaseLiveAdapter {
  constructor({ bus } = {}) {
    super('obs', { bus });
    this.scenes = [];
    this.streaming = false;
    this.recording = false;
  }

  async onConnect() {
    // Local-only: "connected" means Companion/OBS client path is available to the browser.
    // Server never holds OBS password.
    this.state = 'CONNECTED';
    this.lastError = null;
    return {
      ...this.connectionSnapshot(),
      honesty: {
        note: 'OBS credentials stay on the creator machine. Use Studio → Companion or localhost WebSocket.'
      }
    };
  }

  applyLocalStatus({ scenes = [], streaming = false, recording = false } = {}) {
    this.scenes = scenes;
    this.streaming = !!streaming;
    this.recording = !!recording;
    if (this.state !== 'CONNECTED') this.state = 'CONNECTED';
    return this.connectionSnapshot();
  }

  allowedActions() {
    return [
      'GetSceneList', 'SetCurrentProgramScene', 'SetSceneItemEnabled',
      'StartStream', 'StopStream', 'StartRecord', 'StopRecord',
      'SetInputMute', 'GetStreamStatus', 'GetRecordStatus'
    ];
  }
}
