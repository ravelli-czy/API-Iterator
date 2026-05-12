import { contextBridge, ipcRenderer } from 'electron';
import type { AppData, ExecuteRequestInput, ExecuteRequestResult, SaveFileInput, SaveFileResult } from '../src/shared/types.js';

export interface ApiIteratorBridge {
  loadData: () => Promise<AppData>;
  saveData: (data: AppData) => Promise<AppData>;
  executeRequest: (input: ExecuteRequestInput) => Promise<ExecuteRequestResult>;
  saveFile: (input: SaveFileInput) => Promise<SaveFileResult>;
}

const api: ApiIteratorBridge = {
  loadData: () => ipcRenderer.invoke('store:load'),
  saveData: (data) => ipcRenderer.invoke('store:save', data),
  executeRequest: (input) => ipcRenderer.invoke('request:execute', input),
  saveFile: (input) => ipcRenderer.invoke('file:save', input)
};

contextBridge.exposeInMainWorld('apiIterator', api);
