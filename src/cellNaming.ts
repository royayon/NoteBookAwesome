import * as vscode from 'vscode';
import { createHash } from 'crypto';

// In-memory cache: notebook URI → { hash → { name?, color? } }
// Populated from the .ipynb file on every notebook open.
type CellMap = Record<string, Record<string, string>>;
const _cache = new Map<string, CellMap>();

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
    const nba = ipynb.metadata?.[NBA_KEY] as { cells?: CellMap } | undefined;
    _cache.set(notebook.uri.toString(), nba?.cells ?? {});
  } catch {
    _cache.set(notebook.uri.toString(), {});
  }
}

/**
 * Patches the .ipynb file on disk with all current names/colors from the cache.
 * Called from onDidSaveNotebookDocument — runs after the Jupyter extension writes
 * the file so we don't fight their serializer.
 */
export async function injectMetadataIntoFile(notebook: vscode.NotebookDocument): Promise<void> {
  const map = _cache.get(notebook.uri.toString()) ?? {};
  try {
    const bytes = await vscode.workspace.fs.readFile(notebook.uri);
    const ipynb = JSON.parse(new TextDecoder().decode(bytes)) as IpynbRoot;

    if (!ipynb.metadata) { ipynb.metadata = {}; }
    if (Object.keys(map).length) {
      ipynb.metadata[NBA_KEY] = { cells: map };
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
