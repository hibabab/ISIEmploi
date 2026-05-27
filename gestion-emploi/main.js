import { app, BrowserWindow } from 'electron';

function createWindow() {
  const win = new BrowserWindow({
    width: 2000,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      devTools: false   // empêche l'ouverture du DevTools
    }
  });

  win.loadURL('http://localhost:5137');
}

app.whenReady().then(createWindow);