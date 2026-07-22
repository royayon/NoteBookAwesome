import * as vscode from 'vscode';
import { createHash } from 'crypto';

const METADATA_KEY = 'notebookawesome';

let _ctx: vscode.ExtensionContext | undefined;

export function initCellNaming(ctx: vscode.ExtensionContext): void {
  _ctx = ctx;
}

// SHA-1 of cell source, scoped to notebook URI.
// Stable across reorders: the hash follows the content, not the position.
// Known edge case: two cells with identical content share a name — acceptable
// in practice since meaningful cells are rarely byte-for-byte identical.
function wsKey(prop: string, cell: vscode.NotebookCell): string {
  const hash = createHash('sha1').update(cell.document.getText()).digest('hex').slice(0, 16);
  return `nba.${prop}:${cell.notebook.uri.toString()}:${hash}`;
}

function getCellProp(prop: string, cell: vscode.NotebookCell): string | undefined {
  // Primary: content-hash key survives drag-and-drop reorders
  const fromWs = _ctx?.workspaceState.get<string>(wsKey(prop, cell));
  if (fromWs) { return fromWs; }
  // Fallback: cell metadata (written for .ipynb portability, or from older versions)
  return (cell.metadata?.[METADATA_KEY] as Record<string, string> | undefined)?.[prop];
}

async function setCellProp(prop: string, cell: vscode.NotebookCell, value: string | undefined): Promise<void> {
  // Authoritative store: workspaceState by content hash
  await _ctx?.workspaceState.update(wsKey(prop, cell), value);

  // Also write to cell metadata so the value travels with the .ipynb when shared
  const existingNba = (cell.metadata?.[METADATA_KEY] ?? {}) as Record<string, unknown>;
  const updatedNba = { ...existingNba };
  if (value) {
    updatedNba[prop] = value;
  } else {
    delete updatedNba[prop];
  }

  const updatedMeta: Record<string, unknown> = { ...cell.metadata, [METADATA_KEY]: updatedNba };
  if (!Object.keys(updatedNba).length) { delete updatedMeta[METADATA_KEY]; }

  const edit = new vscode.WorkspaceEdit();
  edit.set(cell.notebook.uri, [vscode.NotebookEdit.updateCellMetadata(cell.index, updatedMeta)]);
  await vscode.workspace.applyEdit(edit);
}

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
