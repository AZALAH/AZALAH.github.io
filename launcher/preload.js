'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('launcher', {
  state: () => ipcRenderer.invoke('launcher:state'),
  check: () => ipcRenderer.send('launcher:check'),
  play: () => ipcRenderer.send('launcher:play'),
  set: (key, value) => ipcRenderer.send('launcher:set', key, value),
  minimize: () => ipcRenderer.send('launcher:minimize'),
  close: () => ipcRenderer.send('launcher:close'),
  site: () => ipcRenderer.send('launcher:site'),
  onUpdate: fn => ipcRenderer.on('update', (_e, d) => fn(d)),
  onGameClosed: fn => ipcRenderer.on('game-closed', () => fn())
});
