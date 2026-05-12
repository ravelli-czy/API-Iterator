import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { KeyValueEditor } from './components/KeyValueEditor';
import type { AppData, EnvironmentConfig, ExecuteRequestResult, IteratorResult, RequestConfig } from './shared/types';
import { parseCsv, toCsv } from './utils/csv';
import { createId, formatBody, keyValueRow, prepareRequest } from './utils/request';
import './styles.css';

type View = 'requests' | 'environments' | 'iterator';

const emptyData: AppData = { requests: [], environments: [] };

function now() {
  return new Date().toISOString();
}

function createRequest(): RequestConfig {
  return {
    id: createId('req'),
    name: 'New GET request',
    method: 'GET',
    url: 'https://httpbin.org/get',
    headers: [],
    queryParams: [],
    updatedAt: now()
  };
}

function createEnvironment(): EnvironmentConfig {
  return {
    id: createId('env'),
    name: 'New environment',
    variables: [],
    updatedAt: now()
  };
}

function App() {
  const [view, setView] = useState<View>('requests');
  const [data, setData] = useState<AppData>(emptyData);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [saveState, setSaveState] = useState('Saved locally');

  useEffect(() => {
    window.apiIterator.loadData().then((loadedData) => {
      setData(loadedData);
      setSelectedRequestId(loadedData.requests[0]?.id ?? '');
      setSelectedEnvironmentId(loadedData.environments[0]?.id ?? '');
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) return;
    setSaveState('Saving...');
    const timeoutId = window.setTimeout(() => {
      window.apiIterator.saveData(data).then(() => setSaveState('Saved locally'));
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [data, isReady]);

  const selectedRequest = data.requests.find((request) => request.id === selectedRequestId);
  const selectedEnvironment = data.environments.find((environment) => environment.id === selectedEnvironmentId);

  const updateRequest = (request: RequestConfig) => {
    setData((current) => ({
      ...current,
      requests: current.requests.map((item) => (item.id === request.id ? { ...request, updatedAt: now() } : item))
    }));
  };

  const updateEnvironment = (environment: EnvironmentConfig) => {
    setData((current) => ({
      ...current,
      environments: current.environments.map((item) => (item.id === environment.id ? { ...environment, updatedAt: now() } : item))
    }));
  };

  const addRequest = () => {
    const request = createRequest();
    setData((current) => ({ ...current, requests: [...current.requests, request] }));
    setSelectedRequestId(request.id);
    setView('requests');
  };

  const addEnvironment = () => {
    const environment = createEnvironment();
    setData((current) => ({ ...current, environments: [...current.environments, environment] }));
    setSelectedEnvironmentId(environment.id);
    setView('environments');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">AI</span>
          <div>
            <strong>API Iterator</strong>
            <small>Mini Postman GET runner</small>
          </div>
        </div>
        <nav>
          <button className={view === 'requests' ? 'active' : ''} onClick={() => setView('requests')}>Requests</button>
          <button className={view === 'environments' ? 'active' : ''} onClick={() => setView('environments')}>Environments</button>
          <button className={view === 'iterator' ? 'active' : ''} onClick={() => setView('iterator')}>Iterator</button>
        </nav>
        <div className="sidebar-actions">
          <button onClick={addRequest}>+ Request</button>
          <button onClick={addEnvironment}>+ Environment</button>
        </div>
        <p className="save-state">{saveState}</p>
      </aside>

      <main className="content">
        {view === 'requests' && (
          <RequestBuilder
            requests={data.requests}
            environments={data.environments}
            selectedRequest={selectedRequest}
            selectedRequestId={selectedRequestId}
            selectedEnvironmentId={selectedEnvironmentId}
            onSelectRequest={setSelectedRequestId}
            onSelectEnvironment={setSelectedEnvironmentId}
            onUpdateRequest={updateRequest}
            onAddRequest={addRequest}
          />
        )}
        {view === 'environments' && (
          <Environments
            environments={data.environments}
            selectedEnvironment={selectedEnvironment}
            selectedEnvironmentId={selectedEnvironmentId}
            onSelectEnvironment={setSelectedEnvironmentId}
            onUpdateEnvironment={updateEnvironment}
            onAddEnvironment={addEnvironment}
          />
        )}
        {view === 'iterator' && (
          <Iterator
            requests={data.requests}
            environments={data.environments}
            selectedRequestId={selectedRequestId}
            selectedEnvironmentId={selectedEnvironmentId}
            onSelectRequest={setSelectedRequestId}
            onSelectEnvironment={setSelectedEnvironmentId}
          />
        )}
      </main>
    </div>
  );
}

interface RequestBuilderProps {
  requests: RequestConfig[];
  environments: EnvironmentConfig[];
  selectedRequest?: RequestConfig;
  selectedRequestId: string;
  selectedEnvironmentId: string;
  onSelectRequest: (id: string) => void;
  onSelectEnvironment: (id: string) => void;
  onUpdateRequest: (request: RequestConfig) => void;
  onAddRequest: () => void;
}

function RequestBuilder(props: RequestBuilderProps) {
  const [response, setResponse] = useState<ExecuteRequestResult | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const environment = props.environments.find((item) => item.id === props.selectedEnvironmentId);

  const send = async () => {
    if (!props.selectedRequest) return;
    setSending(true);
    setError('');
    setResponse(null);
    try {
      const prepared = prepareRequest(props.selectedRequest, environment);
      const result = await window.apiIterator.executeRequest({ url: prepared.url, headers: prepared.headers });
      setResponse(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unknown request error');
    } finally {
      setSending(false);
    }
  };

  if (!props.selectedRequest) {
    return <EmptyState title="No requests yet" action="Create first request" onAction={props.onAddRequest} />;
  }

  return (
    <div className="workspace">
      <header className="page-header">
        <div>
          <h1>Request Builder</h1>
          <p>Crear, editar y ejecutar requests GET con variables tipo {'{{variable}}'}.</p>
        </div>
        <button className="primary" disabled={sending} onClick={send}>{sending ? 'Sending...' : 'Send'}</button>
      </header>

      <div className="toolbar card">
        <label>
          Saved request
          <select value={props.selectedRequestId} onChange={(event) => props.onSelectRequest(event.target.value)}>
            {props.requests.map((request) => <option key={request.id} value={request.id}>{request.name}</option>)}
          </select>
        </label>
        <label>
          Environment
          <select value={props.selectedEnvironmentId} onChange={(event) => props.onSelectEnvironment(event.target.value)}>
            <option value="">No environment</option>
            {props.environments.map((environmentItem) => <option key={environmentItem.id} value={environmentItem.id}>{environmentItem.name}</option>)}
          </select>
        </label>
      </div>

      <section className="card request-line">
        <label>
          Name
          <input value={props.selectedRequest.name} onChange={(event) => props.onUpdateRequest({ ...props.selectedRequest!, name: event.target.value })} />
        </label>
        <label className="method-label">
          Method
          <select value="GET" disabled><option>GET</option></select>
        </label>
        <label className="url-label">
          URL
          <input value={props.selectedRequest.url} onChange={(event) => props.onUpdateRequest({ ...props.selectedRequest!, url: event.target.value })} />
        </label>
      </section>

      <div className="two-columns">
        <KeyValueEditor title="Headers" rows={props.selectedRequest.headers} onChange={(headers) => props.onUpdateRequest({ ...props.selectedRequest!, headers })} />
        <KeyValueEditor title="Query Params" rows={props.selectedRequest.queryParams} onChange={(queryParams) => props.onUpdateRequest({ ...props.selectedRequest!, queryParams })} />
      </div>

      <ResponsePanel response={response} error={error} />
    </div>
  );
}

function ResponsePanel({ response, error }: { response: ExecuteRequestResult | null; error: string }) {
  const formattedBody = useMemo(() => {
    if (!response) return '';
    return formatBody(response.body, response.headers['content-type']);
  }, [response]);

  return (
    <section className="card response-panel">
      <div className="section-heading">
        <h3>Response</h3>
        {response && <span className={response.ok ? 'pill ok' : 'pill error'}>{response.status} {response.statusText} · {response.durationMs} ms</span>}
      </div>
      {error && <div className="alert error">{error}</div>}
      {!response && !error && <p className="muted">La respuesta aparecerá aquí después de enviar la request.</p>}
      {response && (
        <div className="response-grid">
          <div>
            <h4>Headers</h4>
            <pre>{JSON.stringify(response.headers, null, 2)}</pre>
          </div>
          <div>
            <h4>Body</h4>
            <pre>{formattedBody}</pre>
          </div>
        </div>
      )}
    </section>
  );
}

interface EnvironmentsProps {
  environments: EnvironmentConfig[];
  selectedEnvironment?: EnvironmentConfig;
  selectedEnvironmentId: string;
  onSelectEnvironment: (id: string) => void;
  onUpdateEnvironment: (environment: EnvironmentConfig) => void;
  onAddEnvironment: () => void;
}

function Environments(props: EnvironmentsProps) {
  const [showSensitive, setShowSensitive] = useState(false);

  if (!props.selectedEnvironment) {
    return <EmptyState title="No environments yet" action="Create first environment" onAction={props.onAddEnvironment} />;
  }

  return (
    <div className="workspace">
      <header className="page-header">
        <div>
          <h1>Environments</h1>
          <p>Variables locales key/value para resolver URL, headers y query params.</p>
        </div>
        <button className="secondary" onClick={() => setShowSensitive((current) => !current)}>{showSensitive ? 'Hide sensitive' : 'Show sensitive'}</button>
      </header>
      <div className="toolbar card">
        <label>
          Environment
          <select value={props.selectedEnvironmentId} onChange={(event) => props.onSelectEnvironment(event.target.value)}>
            {props.environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)}
          </select>
        </label>
        <label>
          Name
          <input value={props.selectedEnvironment.name} onChange={(event) => props.onUpdateEnvironment({ ...props.selectedEnvironment!, name: event.target.value })} />
        </label>
      </div>
      <KeyValueEditor
        title="Variables"
        rows={props.selectedEnvironment.variables}
        sensitiveMode
        revealSensitive={showSensitive}
        onChange={(variables) => props.onUpdateEnvironment({ ...props.selectedEnvironment!, variables })}
      />
      <p className="hint">Tip: marca tokens como sensibles para ocultarlos por defecto. Los valores se guardan únicamente en el JSON local de Electron.</p>
    </div>
  );
}

interface IteratorProps {
  requests: RequestConfig[];
  environments: EnvironmentConfig[];
  selectedRequestId: string;
  selectedEnvironmentId: string;
  onSelectRequest: (id: string) => void;
  onSelectEnvironment: (id: string) => void;
}

function Iterator(props: IteratorProps) {
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvName, setCsvName] = useState('');
  const [delayMs, setDelayMs] = useState(0);
  const [results, setResults] = useState<IteratorResult[]>([]);
  const [running, setRunning] = useState(false);
  const stopRequested = useRef(false);

  const request = props.requests.find((item) => item.id === props.selectedRequestId);
  const environment = props.environments.find((item) => item.id === props.selectedEnvironmentId);
  const canRun = Boolean(request && csvRows.length > 0 && !running);

  const loadCsv = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setCsvRows(parseCsv(text));
    setCsvName(file.name);
    setResults([]);
  };

  const run = async () => {
    if (!request) return;
    stopRequested.current = false;
    setRunning(true);
    setResults([]);

    for (let index = 0; index < csvRows.length; index += 1) {
      if (stopRequested.current) break;
      const variables = csvRows[index];
      const prepared = prepareRequest(request, environment, variables);
      const started = performance.now();
      try {
        const response = await window.apiIterator.executeRequest({ url: prepared.url, headers: prepared.headers });
        setResults((current) => [
          ...current,
          {
            iteration: index + 1,
            variables,
            finalUrl: prepared.url,
            statusCode: response.status,
            durationMs: response.durationMs,
            result: response.ok ? 'OK' : 'Error',
            errorMessage: response.ok ? '' : `${response.status} ${response.statusText}`,
            responsePreview: response.body.slice(0, 500)
          }
        ]);
      } catch (error) {
        setResults((current) => [
          ...current,
          {
            iteration: index + 1,
            variables,
            finalUrl: prepared.url,
            durationMs: Math.round(performance.now() - started),
            result: 'Error',
            errorMessage: error instanceof Error ? error.message : 'Unknown request error'
          }
        ]);
      }

      if (delayMs > 0 && index < csvRows.length - 1 && !stopRequested.current) {
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
      }
    }

    setRunning(false);
  };

  const exportJson = async () => {
    await window.apiIterator.saveFile({
      defaultPath: 'iterator-results.json',
      content: JSON.stringify(results, null, 2),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
  };

  const exportCsv = async () => {
    await window.apiIterator.saveFile({
      defaultPath: 'iterator-results.csv',
      content: toCsv(results),
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
  };

  const exportErrors = async () => {
    const errors = results.filter((result) => result.result === 'Error');
    await window.apiIterator.saveFile({
      defaultPath: 'iterator-errors.json',
      content: JSON.stringify(errors, null, 2),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
  };

  return (
    <div className="workspace">
      <header className="page-header">
        <div>
          <h1>Iterator</h1>
          <p>Ejecuta una request guardada una vez por cada fila del CSV.</p>
        </div>
        <div className="button-row">
          <button className="primary" disabled={!canRun} onClick={run}>{running ? 'Running...' : 'Run CSV'}</button>
          <button className="secondary" disabled={!running} onClick={() => { stopRequested.current = true; }}>Stop</button>
        </div>
      </header>

      <section className="card iterator-config">
        <label>
          Request
          <select value={props.selectedRequestId} onChange={(event) => props.onSelectRequest(event.target.value)}>
            <option value="">Select request</option>
            {props.requests.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          Environment
          <select value={props.selectedEnvironmentId} onChange={(event) => props.onSelectEnvironment(event.target.value)}>
            <option value="">No environment</option>
            {props.environments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          Delay (ms)
          <input type="number" min="0" value={delayMs} onChange={(event) => setDelayMs(Number(event.target.value))} />
        </label>
        <label>
          CSV file
          <input type="file" accept=".csv,text/csv" onChange={(event) => loadCsv(event.target.files?.[0])} />
        </label>
      </section>

      <section className="card">
        <div className="section-heading">
          <h3>CSV Rows</h3>
          <span className="pill">{csvName || 'No file'} · {csvRows.length} rows</span>
        </div>
        {csvRows.length > 0 ? <pre className="compact-pre">{JSON.stringify(csvRows.slice(0, 5), null, 2)}</pre> : <p className="muted">Carga un CSV con headers. Ejemplo: orderId.</p>}
      </section>

      <section className="card results-card">
        <div className="section-heading">
          <h3>Iterator Results</h3>
          <div className="button-row">
            <button className="secondary" disabled={results.length === 0} onClick={exportJson}>Export JSON</button>
            <button className="secondary" disabled={results.length === 0} onClick={exportCsv}>Export CSV</button>
            <button className="secondary" disabled={!results.some((result) => result.result === 'Error')} onClick={exportErrors}>Save errors</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Variables</th>
                <th>Final URL</th>
                <th>Status</th>
                <th>Time</th>
                <th>Result</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.iteration}>
                  <td>{result.iteration}</td>
                  <td><code>{JSON.stringify(result.variables)}</code></td>
                  <td className="url-cell">{result.finalUrl}</td>
                  <td>{result.statusCode ?? '-'}</td>
                  <td>{result.durationMs ?? '-'} ms</td>
                  <td><span className={result.result === 'OK' ? 'pill ok' : 'pill error'}>{result.result}</span></td>
                  <td>{result.errorMessage}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={7} className="empty-row">No hay resultados todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="empty-state card">
      <h2>{title}</h2>
      <p>Crea un elemento para comenzar.</p>
      <button className="primary" onClick={onAction}>{action}</button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
