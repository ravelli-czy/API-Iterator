import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppData, ExecuteRequestInput, ExecuteRequestResult, SaveFileInput } from '../src/shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultData: AppData = {
  requests: [],
  environments: []
};

function getDataPath() {
  return path.join(app.getPath('userData'), 'data.json');
}

async function ensureDataFile() {
  const dataPath = getDataPath();
  await mkdir(path.dirname(dataPath), { recursive: true });
  try {
    await readFile(dataPath, 'utf-8');
  } catch {
    await writeFile(dataPath, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

async function readData(): Promise<AppData> {
  await ensureDataFile();
  const raw = await readFile(getDataPath(), 'utf-8');
  return { ...defaultData, ...JSON.parse(raw) };
}

async function writeData(data: AppData): Promise<AppData> {
  await mkdir(path.dirname(getDataPath()), { recursive: true });
  await writeFile(getDataPath(), JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    title: 'API Iterator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  }
}

ipcMain.handle('store:load', async () => readData());
ipcMain.handle('store:save', async (_event, data: AppData) => writeData(data));

ipcMain.handle('request:execute', async (_event, input: ExecuteRequestInput): Promise<ExecuteRequestResult> => {
  const startedAt = performance.now();
  const response = await fetch(input.url, {
    method: 'GET',
    headers: input.headers,
    redirect: 'follow'
  });
  const body = await response.text();
  const durationMs = Math.round(performance.now() - startedAt);
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    durationMs,
    headers,
    body
  };
});

ipcMain.handle('file:save', async (_event, input: SaveFileInput) => {
  const result = await dialog.showSaveDialog({
    defaultPath: input.defaultPath,
    filters: input.filters
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await writeFile(result.filePath, input.content, 'utf-8');
  return { canceled: false, filePath: result.filePath };
});

app.whenReady().then(async () => {
  await ensureDataFile();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
