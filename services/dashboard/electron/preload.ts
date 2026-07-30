import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('vers', {
  platform: process.platform,
});
