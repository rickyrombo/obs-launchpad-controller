const { ipcRenderer } = window.require('electron');

class Nanoleaf {
  constructor() {
    this.ip === null;
    this.port = 16021;
    this.authToken = null;
  }

  async fetch(path, options) {
    if (!this.ip) {
      console.log('Finding nanoleaf...')
      this.ip = await ipcRenderer.invoke('find-nanoleaf-address', 15000);
    }
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
      return Promise.resolve(this.authToken);
    }
    this.authToken = localStorage.getItem('nanoleaf-auth-token');
    if (this.authToken) {
      console.log('Authentication loaded from local storage', this.authToken);
      return Promise.resolve(this.authToken);
    }
    return this.fetch('new', { method: 'POST' }).then((res) => {
      console.log('Got new authentication token', res.body.auth_token)
      this.authToken = res.body.auth_token;
      localStorage.setItem('nanoleaf-auth-token', this.authToken);
      return this.authToken;
    });
  }

  getState() {
    return this.fetch('state').then((res) => {
      console.log('getstate', res.status, res.statusText, res.body);
    })
  }

  setState(state) {
    return this.fetch('state', { method: 'PUT', body: state });
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