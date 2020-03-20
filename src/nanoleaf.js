const { ipcRenderer } = window.require('electron');

class Nanoleaf {
  constructor() {
    this.ip = "192.168.1.129";
    this.port = 16021;
    this.authToken = null;
  }

  async fetch(path, options) {
    const response = await ipcRenderer.invoke('proxy-request', {
      method: 'GET',
      hostname: this.ip,
      port: this.port,
      path: this._getApiPath(path),
      ...options,
    });
    return new Promise((resolve, reject) => {
      if (response.status >= 200 && response.status < 300) {
        resolve(response);
      } else {
        reject(response);
      }
    })
  }

  _getApiPath(path) {
    if (path == 'new') {
      return `/api/v1/${path}`
    }
    return `/api/v1/${this.authToken}/${path}`;
  }

  authenticate() {
    if (this.authToken) {
      console.log('Already authenticated');
      return;
    }
    this.authToken = localStorage.getItem('nanoleaf-auth-token');
    if (this.authToken) {
      console.log('Authentication loaded from local storage', this.authToken);
      return;
    }
    this.fetch('new', { method: 'POST' }).then((res) => {
      this.authToken = res.body.auth_token;
      localStorage.setItem('nanoleaf-auth-token', this.authToken);
    });
  }

  getState() {
    return fetch(this._getFullApiPath('state')).then((res) => {
      console.log('getstate', res.status, res.statusText)
      return res.json();
    }).then(json => {
      console.log(json);
      return json;
    })
  }

  setState(state) {
    return fetch(this._getFullApiPath('state'), { method: 'PUT', body: JSON.stringify(state) });
  }

  async getEffectsList() {
    const res = await this.fetch('effects/effectsList');
    return res.body;
  }

  async getEffect(name) {
    const res = await this.fetch('effects', { method: 'PUT', body: { write: { command: 'request', animName: name } } });
    return res.body;
  }

  async getAllEffects() {
    const res = await this.fetch('effects', { method: 'PUT', body: { write: { command: 'requestAll' } } });
    return res.body.animations;
  }

  async setSelectedEffect(effectName) {
    return await this.fetch('effects/select', {
      method: 'PUT',
      body: { select: effectName }
    });
  }
}

export default Nanoleaf;