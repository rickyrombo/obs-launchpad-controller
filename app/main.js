const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const { findNanoleafAddress } = require('./ssdp.js');

app.on('ready', () => {
    let win = new BrowserWindow({
        width: 320,
        height: 240,
        icon: 'assets/icon-48.png',
        webPreferences: {
          nodeIntegration: true,
        }
    });
    
    if (process.env.NODE_ENV == 'development') {
        console.log('Loading Webpack Dev Server...');
        win.loadURL('https://localhost');
        win.webContents.openDevTools();
    } else {
        win.loadFile('build/index.html');
    }
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