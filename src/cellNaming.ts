import * as vscode from 'vscode';
import { createHash } from 'crypto';

// In-memory cache: notebook URI → { hash → { name?, color? } }
// Populated from the .ipynb file on every notebook open.
type CellMap = Record<string, Record<string, string>>;
const _cache = new Map<string, CellMap>();

// A named run sequence: an ordered list of cells (by content hash) to execute.
export type CellSequence = { name: string; cells: string[] };
const _seqCache = new Map<string, CellSequence[]>();

function cellHash(cell: vscode.NotebookCell): string {
  return createHash('sha1').update(cell.document.getText()).digest('hex').slice(0, 16);
}

function getCellProp(prop: string, cell: vscode.NotebookCell): string | undefined {
  return _cache.get(cell.notebook.uri.toString())?.[cellHash(cell)]?.[prop];
}

async function setCellProp(prop: string, cell: vscode.NotebookCell, value: string | undefined): Promise<void> {
  const key = cell.notebook.uri.toString();
  const map: CellMap = { ...(_cache.get(key) ?? {}) };
  const hash = cellHash(cell);
  const entry = { ...(map[hash] ?? {}) };

  if (value !== undefined) {
    entry[prop] = value;
  } else {
    delete entry[prop];
  }

  if (Object.keys(entry).length) {
    map[hash] = entry;
  } else {
    delete map[hash];
  }

  _cache.set(key, map);
  // Disk write happens in injectMetadataIntoFile() on every save
}

// ── .ipynb I/O ─────────────────────────────────────────────────────────────

const NBA_KEY = 'notebookawesome';
type IpynbRoot = { metadata?: Record<string, unknown>; [key: string]: unknown };

/**
 * Reads names/colors from the .ipynb file and seeds the in-memory cache.
 * The file always wins on open — stale cache is replaced.
 */
export async function seedCellPropsFromNotebook(notebook: vscode.NotebookDocument): Promise<void> {
  try {
    const bytes = await vscode.workspace.fs.readFile(notebook.uri);
    const ipynb = JSON.parse(new TextDecoder().decode(bytes)) as IpynbRoot;
    const nba = ipynb.metadata?.[NBA_KEY] as { cells?: CellMap; sequences?: CellSequence[] } | undefined;
    _cache.set(notebook.uri.toString(), nba?.cells ?? {});
    _seqCache.set(notebook.uri.toString(), Array.isArray(nba?.sequences) ? nba!.sequences : []);
  } catch {
    _cache.set(notebook.uri.toString(), {});
    _seqCache.set(notebook.uri.toString(), []);
  }
}

/**
 * Patches the .ipynb file on disk with all current names/colors from the cache.
 * Called from onDidSaveNotebookDocument — runs after the Jupyter extension writes
 * the file so we don't fight their serializer.
 */
export async function injectMetadataIntoFile(notebook: vscode.NotebookDocument): Promise<void> {
  const map = _cache.get(notebook.uri.toString()) ?? {};
  const sequences = _seqCache.get(notebook.uri.toString()) ?? [];
  try {
    const bytes = await vscode.workspace.fs.readFile(notebook.uri);
    const ipynb = JSON.parse(new TextDecoder().decode(bytes)) as IpynbRoot;

    if (!ipynb.metadata) { ipynb.metadata = {}; }
    const nba: Record<string, unknown> = {};
    if (Object.keys(map).length) { nba.cells = map; }
    if (sequences.length) { nba.sequences = sequences; }
    if (Object.keys(nba).length) {
      ipynb.metadata[NBA_KEY] = nba;
    } else {
      delete ipynb.metadata[NBA_KEY];
    }

    await vscode.workspace.fs.writeFile(
      notebook.uri,
      new TextEncoder().encode(JSON.stringify(ipynb, null, 1)),
    );
  } catch { /* best-effort */ }
}

// ── Public API ─────────────────────────────────────────────────────────────

export function getCellName(cell: vscode.NotebookCell): string | undefined {
  return getCellProp('name', cell);
}

export async function setCellName(cell: vscode.NotebookCell, name: string | undefined): Promise<void> {
  await setCellProp('name', cell, name);
}

export function getCellColor(cell: vscode.NotebookCell): string | undefined {
  return getCellProp('color', cell);
}

export async function setCellColor(cell: vscode.NotebookCell, color: string | undefined): Promise<void> {
  await setCellProp('color', cell, color);
}

export type PaletteEntry = { name: string; color: string };

const DEFAULT_PALETTE: PaletteEntry[] = [
  { name: 'Red', color: '#e05252' },
  { name: 'Orange', color: '#e08a3c' },
  { name: 'Yellow', color: '#d4b83c' },
  { name: 'Green', color: '#4caf6e' },
  { name: 'Blue', color: '#4a90d9' },
  { name: 'Purple', color: '#9b6dd6' },
];

export function getColorPalette(): PaletteEntry[] {
  const configured = vscode.workspace
    .getConfiguration('notebookawesome')
    .get<PaletteEntry[]>('colorPalette');
  return configured && configured.length ? configured : DEFAULT_PALETTE;
}

export function getActiveCell(): vscode.NotebookCell | undefined {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) { return undefined; }
  const sel = editor.selection;
  if (sel.isEmpty) { return undefined; }
  return editor.notebook.cellAt(sel.start);
}

// ── Run sequences ────────────────────────────────────────────────────────────

/** Returns a deep copy of the notebook's saved run sequences. */
export function getSequences(notebook: vscode.NotebookDocument): CellSequence[] {
  return (_seqCache.get(notebook.uri.toString()) ?? []).map(s => ({ name: s.name, cells: [...s.cells] }));
}

/** Replaces the notebook's sequences in the cache (persisted to the .ipynb on save). */
export function setSequences(notebook: vscode.NotebookDocument, sequences: CellSequence[]): void {
  _seqCache.set(notebook.uri.toString(), sequences.map(s => ({ name: s.name, cells: [...s.cells] })));
}

/** Maps content hashes → current 0-based cell index. First occurrence wins for identical cells. */
function buildHashIndex(notebook: vscode.NotebookDocument): Map<string, number> {
  const index = new Map<string, number>();
  for (let i = 0; i < notebook.cellCount; i++) {
    const hash = cellHash(notebook.cellAt(i));
    if (!index.has(hash)) { index.set(hash, i); }
  }
  return index;
}

export type ParsedNumbers = { numbers: number[]; invalid: string[] };

/**
 * Parses a user string like "1, 2-5, 8" into an ordered list of 1-based cell
 * numbers. Ranges expand in the direction written (5-2 → 5,4,3,2). Order and
 * duplicates are preserved — a sequence may intentionally run a cell twice.
 * Unrecognized tokens are returned separately in `invalid`.
 */
export function parseCellNumbers(input: string): ParsedNumbers {
  const numbers: number[] = [];
  const invalid: string[] = [];
  for (const raw of input.split(',')) {
    const part = raw.trim();
    if (!part) { continue; }
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const a = parseInt(range[1], 10);
      const b = parseInt(range[2], 10);
      if (a <= b) { for (let n = a; n <= b; n++) { numbers.push(n); } }
      else { for (let n = a; n >= b; n--) { numbers.push(n); } }
    } else if (/^\d+$/.test(part)) {
      numbers.push(parseInt(part, 10));
    } else {
      invalid.push(part);
    }
  }
  return { numbers, invalid };
}

/** Converts 1-based cell numbers (as typed) into content hashes for storage. */
export function hashesFromPositions(notebook: vscode.NotebookDocument, positions: number[]): string[] {
  const hashes: string[] = [];
  for (const pos of positions) {
    const idx = pos - 1;
    if (idx >= 0 && idx < notebook.cellCount) {
      hashes.push(cellHash(notebook.cellAt(idx)));
    }
  }
  return hashes;
}

export type ResolvedSequence = {
  /** Current 0-based indices of the cells that still exist, in sequence order. */
  indices: number[];
  /** Per-entry current 1-based position, or null if that cell was deleted. */
  positions: (number | null)[];
  /** Count of entries whose cell no longer exists. */
  missing: number;
};

/** Resolves a stored sequence against the notebook's current cells. */
export function resolveSequence(notebook: vscode.NotebookDocument, seq: CellSequence): ResolvedSequence {
  const index = buildHashIndex(notebook);
  const positions = seq.cells.map(hash => {
    const i = index.get(hash);
    return i === undefined ? null : i + 1;
  });
  const indices = positions.filter((p): p is number => p !== null).map(p => p - 1);
  const missing = positions.filter(p => p === null).length;
  return { indices, positions, missing };
}
