class Nanoleaf {
  constructor() {
    this.localProxy = "localhost";
    this.authToken = null;
  }

  _getFullApiPath(path) {
    if (path == 'new') {
      return `http://${this.localProxy}:16021/api/v1/${path}`
    }
    return `http://${this.localProxy}:16021/api/v1/${this.authToken}/${path}`;
  }

  authenticate() {
    if (this.authToken) {
      console.log('Already authenticated');
      return;
    }
    this.authToken = localStorage.getItem('nanoleaf-auth-token');
    if (this.authToken) {
      console.log('Authentication loaded from local storage');
      return;
    }
    
    fetch(this._getFullApiPath('new'), { method: 'POST', mode: 'cors' }).then((res) => {
      console.log('Response:', res.status, res.statusText);
      return res.json();
    }).then(json => {
      console.log(json);
      this.authToken = json.auth_token;
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

  getEffectsList() {
    return fetch(this._getFullApiPath('effects/effectsList')).then(res => {
      return res.json();
    });
  }

  async setSelectedEffect(effectName) {
    return await fetch(this._getFullApiPath('effects/select'), {
      method: 'PUT',
      body: JSON.stringify({select: effectName})
    });
  }
}

export default Nanoleaf;