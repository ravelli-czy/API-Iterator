import type { EnvironmentConfig, KeyValuePair, RequestConfig } from '../shared/types';

export type VariableMap = Record<string, string>;

export interface PreparedRequest {
  url: string;
  headers: Record<string, string>;
  variables: VariableMap;
}

const variablePattern = /{{\s*([\w.-]+)\s*}}/g;

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function enabledPairsToRecord(pairs: KeyValuePair[]) {
  return pairs.reduce<Record<string, string>>((acc, pair) => {
    if (pair.enabled && pair.key.trim()) {
      acc[pair.key.trim()] = pair.value;
    }
    return acc;
  }, {});
}

export function environmentToVariables(environment?: EnvironmentConfig): VariableMap {
  if (!environment) return {};
  return environment.variables.reduce<VariableMap>((acc, variable) => {
    if (variable.enabled && variable.key.trim()) {
      acc[variable.key.trim()] = variable.value;
    }
    return acc;
  }, {});
}

export function substituteVariables(value: string, variables: VariableMap) {
  return value.replace(variablePattern, (_match, variableName: string) => variables[variableName] ?? '');
}

function appendQueryParams(baseUrl: string, queryParams: KeyValuePair[], variables: VariableMap) {
  const enabledParams = queryParams.filter((param) => param.enabled && param.key.trim());
  if (enabledParams.length === 0) return baseUrl;

  try {
    const url = new URL(baseUrl);
    enabledParams.forEach((param) => {
      url.searchParams.set(substituteVariables(param.key.trim(), variables), substituteVariables(param.value, variables));
    });
    return url.toString();
  } catch {
    const query = enabledParams
      .map((param) => {
        const key = encodeURIComponent(substituteVariables(param.key.trim(), variables));
        const value = encodeURIComponent(substituteVariables(param.value, variables));
        return `${key}=${value}`;
      })
      .join('&');
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${query}`;
  }
}

export function prepareRequest(
  request: RequestConfig,
  environment?: EnvironmentConfig,
  iterationVariables: VariableMap = {}
): PreparedRequest {
  const variables = {
    ...environmentToVariables(environment),
    ...iterationVariables
  };
  const substitutedUrl = substituteVariables(request.url, variables);
  const url = appendQueryParams(substitutedUrl, request.queryParams, variables);
  const headers = Object.fromEntries(
    Object.entries(enabledPairsToRecord(request.headers)).map(([key, value]) => [
      substituteVariables(key, variables),
      substituteVariables(value, variables)
    ])
  );

  return { url, headers, variables };
}

export function formatBody(body: string, contentType = '') {
  const looksJson = contentType.toLowerCase().includes('json') || /^[\s\r\n]*[\[{]/.test(body);
  if (!looksJson) return body;

  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function keyValueRow(): KeyValuePair {
  return { id: createId('kv'), key: '', value: '', enabled: true };
}
