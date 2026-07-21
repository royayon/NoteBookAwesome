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
function wsKey(cell: vscode.NotebookCell): string {
  const hash = createHash('sha1').update(cell.document.getText()).digest('hex').slice(0, 16);
  return `nba.name:${cell.notebook.uri.toString()}:${hash}`;
}

export function getCellName(cell: vscode.NotebookCell): string | undefined {
  // Primary: content-hash key survives drag-and-drop reorders
  const fromWs = _ctx?.workspaceState.get<string>(wsKey(cell));
  if (fromWs) { return fromWs; }
  // Fallback: cell metadata name (written by setCellName for .ipynb portability,
  // or left over from older versions)
  return (cell.metadata?.[METADATA_KEY] as { name?: string } | undefined)?.name;
}

export async function setCellName(cell: vscode.NotebookCell, name: string | undefined): Promise<void> {
  // Authoritative store: workspaceState by content hash
  await _ctx?.workspaceState.update(wsKey(cell), name);

  // Also write to cell metadata so the name travels with the .ipynb when shared
  const existingNba = (cell.metadata?.[METADATA_KEY] ?? {}) as Record<string, unknown>;
  const updatedNba = name
    ? { ...existingNba, name }
    : (() => { const c = { ...existingNba }; delete c['name']; return c; })();

  const updatedMeta = {
    ...cell.metadata,
    ...(Object.keys(updatedNba).length ? { [METADATA_KEY]: updatedNba } : {}),
  };
  if (!Object.keys(updatedNba).length) { delete updatedMeta[METADATA_KEY]; }

  const edit = new vscode.WorkspaceEdit();
  edit.set(cell.notebook.uri, [vscode.NotebookEdit.updateCellMetadata(cell.index, updatedMeta)]);
  await vscode.workspace.applyEdit(edit);
}

export function getActiveCell(): vscode.NotebookCell | undefined {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) { return undefined; }
  const sel = editor.selection;
  if (sel.isEmpty) { return undefined; }
  return editor.notebook.cellAt(sel.start);
}
