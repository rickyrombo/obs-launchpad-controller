'use strict';
import { app, BrowserWindow, ipcMain, net } from 'electron';
import * as path from 'path';
import { format as formatUrl } from 'url';
import { findNanoleafAddress } from './ssdp.js';

const isDevelopment = process.env.NODE_ENV !== 'production'

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow

function createMainWindow() {
  const window = new BrowserWindow({
      width: 320,
      height: 240,
      icon: 'assets/icon-48.png',
      webPreferences: {
        nodeIntegration: true,
      }
    })

  if (isDevelopment) {
    window.webContents.openDevTools()
  }

  if (isDevelopment) {
    window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
  }
  else {
    window.loadURL(formatUrl({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file',
      slashes: true
    }))
  }

  window.on('closed', () => {
    mainWindow = null
  })

  window.webContents.on('devtools-opened', () => {
    window.focus()
    setImmediate(() => {
      window.focus()
    })
  })

  return window
}

app.on('ready', () => {
    mainWindow = createMainWindow();
});

ipcMain.handle('proxy-request', async(evt, req) => {
    console.log('Received request to proxy', req);
    const request = net.request(req);
    
    return await new Promise((resolve, reject) => {
        request.on('response', (response) => {
            console.log(response.statusCode, response.statusMessage);
            let body;
            response.on('data', (chunk) => {
                console.log('Received chunk', chunk.toString());
                if (body) {
                    body = Buffer.concat([body, chunk]);
                } else {
                    body = Buffer.from(chunk);
                }
            });
            response.on('end', () => {
                console.log('Response loaded. Replying...');
    
                resolve({
                    status: response.statusCode,
                    statusText: response.statusMessage,
                    body: body ? JSON.parse(body.toString()) : null
                });
            });
            response.on('error', (error) => {
                console.log('error', error);
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        if (req.body) {
            request.end(JSON.stringify(req.body));
        } else {
            request.end();
        }
    })
});

ipcMain.handle('find-nanoleaf-address', async(evt, timeout) => {
    return await findNanoleafAddress(timeout);
});