export class SceneSwitchAction {
  static name = 'Switch Scene';
  static options = {
    light: { type: 'light', label: 'Light' },
    scene: { type: 'text', label: 'Scene Name' },
  }
  constructor(plugin) {
    this.obs = plugin.obs;
  }
  onPressed(button, options) {
    this.obs.send('SetCurrentScene', { 'scene-name': options.scene });
  }
}