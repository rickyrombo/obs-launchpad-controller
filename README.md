# obs-launchpad-controller
A PWA for controlling OBS with a Novation Launchpad. Uses obs-websocket-js.

# Under construction
Check back later! Proceed at your own peril. This is uncharted territory 🦈

# Prequisites

## Setup SSL

Since the app is a PWA and uses Sevice Workers, it's required to use SSL. You'll need to generate a trusted self-signed certificate for localhost.

### Powershell
Run: `.\ssl-gen.ps1`

### Git Bash (OpenSSL)
Run: `.\ssl-gen.sh`

### Manually
The commands create a SSL cert + key, and prompt you to install it into the trusted root store. Then they generate the proper config to wire it into `webpack-dev-server` (or any other node server). If you already have an SSL cert + key, you can choose to make your own `ssl-gen/https-config.gen.js` with following format:

```js
const fs = require("fs");
module.exports = {
  key: fs.readFileSync('path/to/cert.key'),
  cert: fs.readFileSync('path/to/cert.pem')
}
```

Or if you have a PFX:
```js
const fs = require("fs");
module.exports = {
  pfx: fs.readFileSync('path/to/cert.pfx'),
  passphrase: "<< passphrase >>"
}
```