#!/bin/bash
# taken from https://letsencrypt.org/docs/certificates-for-localhost/ 
# and http://kaushikghosh12.blogspot.com/2016/08/self-signed-certificates-with-microsoft.html
# Generate config
printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth" > ./ssl-gen/config.rnf
# Generate key and pem/crt
openssl req -x509 -nodes -sha256 -days 365 -subj "//CN=localhost" \
  -newkey rsa:2048 -keyout ./ssl-gen/cert.key -out ./ssl-gen/cert.pem \
  -extensions EXT -config ./ssl-gen/config.rnf
# Generate the config
printf "const fs = require(\"fs\");\nmodule.exports = {\n  key: fs.readFileSync('./ssl-gen/cert.key'),\n  cert: fs.readFileSync('./ssl-gen/cert.pem')\n}" > ./ssl-gen/https-config.gen.js
# for Windows users, prompt for install in trusted store
winpty openssl.exe pkcs12 -export -in ./ssl-gen/cert.pem -inkey ./ssl-gen/cert.key -CSP "Microsoft Enhanced RSA and AES Cryptographic Provider" -out ./ssl-gen/cert.pfx
start ./ssl-gen/cert.pfx