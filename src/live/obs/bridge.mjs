/** OBS bridge — Studio/Companion remain source of truth; this documents allowed actions for automation. */
export const OBS_AUTOMATION_ACTIONS = Object.freeze([
  'obs_set_scene', 'obs_source_visibility', 'StartStream', 'StopStream', 'StartRecord', 'StopRecord'
]);

export function obsHonesty() {
  return {
    status: 'WORKING_LOCAL',
    note: 'OBS WebSocket + Companion already ship in Studio. Automation plans OBS actions; browser/Companion executes them locally.'
  };
}
