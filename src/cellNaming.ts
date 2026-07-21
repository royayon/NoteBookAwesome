import * as vscode from 'vscode';

const METADATA_KEY = 'notebookawesome';

export function getCellName(cell: vscode.NotebookCell): string | undefined {
  return (cell.metadata?.[METADATA_KEY] as { name?: string } | undefined)?.name;
}

export async function setCellName(cell: vscode.NotebookCell, name: string | undefined): Promise<void> {
  const updatedMeta = { ...cell.metadata };
  if (name) {
    updatedMeta[METADATA_KEY] = { ...(updatedMeta[METADATA_KEY] as object | undefined ?? {}), name };
  } else {
    delete updatedMeta[METADATA_KEY];
  }
  const edit = new vscode.WorkspaceEdit();
  edit.set(cell.notebook.uri, [
    vscode.NotebookEdit.updateCellMetadata(cell.index, updatedMeta),
  ]);
  await vscode.workspace.applyEdit(edit);
}

export function getActiveCell(): vscode.NotebookCell | undefined {
  const editor = vscode.window.activeNotebookEditor;
  if (!editor) { return undefined; }
  const sel = editor.selection;
  if (sel.isEmpty) { return undefined; }
  return editor.notebook.cellAt(sel.start);
}
