const { app, BrowserWindow } = require('electron');
const path = require('path');

app.on('ready', () => {
    let win = new BrowserWindow({
        width: 320,
        height: 240,
        icon: 'assets/icon-48.png'
    });
    
    if (process.env.NODE_ENV !== 'production') {
        console.log('Loading Webpack Dev Server...');
        win.loadURL('https://localhost');
        win.webContents.openDevTools();
    } else {
        console.log(process.env.NODE_ENV, process.env.NODE_ENV.trim() == 'development')
        win.loadFile('dist/index.html');
    }
});