import { SceneSwitchAction } from './actions'
import OBSWebSocket from 'exports-loader?OBSWebSocket!obs-websocket-js/dist/obs-websocket.js'
export default class ObsPlugin {
  static name = 'OBS';
  static actions = [SceneSwitchAction];
  static options = {
    password: { type: 'password', label: 'Password' },
    port: { type: 'number', label: 'Port' }
  }
  constructor() {
    this.obs = new OBSWebSocket();
  }
  onLoad(options) {
    this.obs.connect({...options});
  }
}