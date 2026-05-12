/// <reference types="vite/client" />

import type { ApiIteratorBridge } from '../electron/preload';

declare global {
  interface Window {
    apiIterator: ApiIteratorBridge;
  }
}
