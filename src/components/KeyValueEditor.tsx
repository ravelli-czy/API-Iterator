import type { EnvironmentVariable, KeyValuePair } from '../shared/types';
import { createId } from '../utils/request';

type Pair = KeyValuePair | EnvironmentVariable;

interface Props<T extends Pair> {
  title: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  sensitiveMode?: boolean;
  revealSensitive?: boolean;
}

export function KeyValueEditor<T extends Pair>({ title, rows, onChange, sensitiveMode = false, revealSensitive = false }: Props<T>) {
  const updateRow = (id: string, patch: Partial<T>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const base = { id: createId('kv'), key: '', value: '', enabled: true } as T;
    const row = sensitiveMode ? ({ ...base, sensitive: false } as T) : base;
    onChange([...rows, row]);
  };

  return (
    <section className="card kv-card">
      <div className="section-heading">
        <h3>{title}</h3>
        <button className="secondary" type="button" onClick={addRow}>+ Add</button>
      </div>
      <div className={`kv-grid kv-header ${sensitiveMode ? 'sensitive-grid' : ''}`}>
        <span>On</span>
        <span>Key</span>
        <span>Value</span>
        {sensitiveMode && <span>Sensitive</span>}
        <span />
      </div>
      {rows.map((row) => {
        const isSensitive = 'sensitive' in row && row.sensitive;
        return (
          <div className={`kv-grid ${sensitiveMode ? 'sensitive-grid' : ''}`} key={row.id}>
            <input
              aria-label="enabled"
              type="checkbox"
              checked={row.enabled}
              onChange={(event) => updateRow(row.id, { enabled: event.target.checked } as Partial<T>)}
            />
            <input
              placeholder="key"
              value={row.key}
              onChange={(event) => updateRow(row.id, { key: event.target.value } as Partial<T>)}
            />
            <input
              placeholder="value"
              type={isSensitive && !revealSensitive ? 'password' : 'text'}
              value={row.value}
              onChange={(event) => updateRow(row.id, { value: event.target.value } as Partial<T>)}
            />
            {sensitiveMode && (
              <input
                aria-label="sensitive"
                type="checkbox"
                checked={'sensitive' in row ? row.sensitive : false}
                onChange={(event) => updateRow(row.id, { sensitive: event.target.checked } as Partial<T>)}
              />
            )}
            <button className="ghost danger" type="button" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>Remove</button>
          </div>
        );
      })}
      {rows.length === 0 && <p className="muted">No hay valores configurados todavía.</p>}
    </section>
  );
}
