import { contextBridge, ipcRenderer } from 'electron';

import { IPC, type ModePayload, type OpenPayload, type ScreenMeasureAPI } from '../shared/ipc-types';

const api: ScreenMeasureAPI = {
  onOpen: (cb) => {
    ipcRenderer.on(IPC.OPEN, (_e, payload: OpenPayload) => cb(payload));
  },
  onMode: (cb) => {
    ipcRenderer.on(IPC.MODE, (_e, payload: ModePayload) => cb(payload));
  },
  close: () => ipcRenderer.send(IPC.CLOSE),
  pin: () => ipcRenderer.send(IPC.PIN),
  unpin: () => ipcRenderer.send(IPC.UNPIN),
  setInteractive: (on) => ipcRenderer.send(IPC.SET_INTERACTIVE, on),
  copy: (text) => ipcRenderer.send(IPC.COPY, text),
  quit: () => ipcRenderer.send(IPC.QUIT),
  platform: process.platform,
};

contextBridge.exposeInMainWorld('api', api);
