export function parseCsv(csv: string): Record<string, string>[] {
  const rows = parseRows(csv.replace(/^\uFEFF/, ''));
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row) =>
      headers.reduce<Record<string, string>>((acc, header, index) => {
        if (header) {
          acc[header] = row[index] ?? '';
        }
        return acc;
      }, {})
    );
}

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((parsedRow) => parsedRow.some((parsedCell) => parsedCell.trim() !== ''));
}

export function toCsv<T extends object>(rows: T[]) {
  if (rows.length === 0) return '';
  const headers = Array.from(rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set()));

  return [headers.join(','), ...rows.map((row) => {
    const record = row as Record<string, unknown>;
    return headers.map((header) => escapeCsvCell(record[header])).join(',');
  })].join('\n');
}

function escapeCsvCell(value: unknown) {
  const cell = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}
