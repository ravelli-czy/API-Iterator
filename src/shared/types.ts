export type HttpMethod = 'GET';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface EnvironmentVariable extends KeyValuePair {
  sensitive: boolean;
}

export interface RequestConfig {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  updatedAt: string;
}

export interface EnvironmentConfig {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  updatedAt: string;
}

export interface AppData {
  requests: RequestConfig[];
  environments: EnvironmentConfig[];
}

export interface ExecuteRequestInput {
  url: string;
  headers: Record<string, string>;
}

export interface ExecuteRequestResult {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
}

export interface IteratorResult {
  iteration: number;
  variables: Record<string, string>;
  finalUrl: string;
  statusCode?: number;
  durationMs?: number;
  result: 'OK' | 'Error';
  errorMessage?: string;
  responsePreview?: string;
}

export interface SaveFileInput {
  defaultPath: string;
  content: string;
  filters: Array<{ name: string; extensions: string[] }>;
}

export interface SaveFileResult {
  canceled: boolean;
  filePath?: string;
}
