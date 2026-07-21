import * as vscode from 'vscode';
import { getCellName } from './cellNaming';

/** Shows "N: Name" as a CodeLens label above each notebook cell's code. */
export class CellCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChange.event;

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (document.uri.scheme !== 'vscode-notebook-cell') { return []; }
    const cell = getCellForDocument(document);
    if (!cell) { return []; }

    const index = cell.index + 1;
    const name = getCellName(cell);
    const label = name
      ? `        ${index}:   ${name}        `
      : `        Cell ${index}        `;

    const range = new vscode.Range(0, 0, 0, 0);
    return [
      new vscode.CodeLens(range, {
        title: label,
        command: 'notebookawesome.renameCell',
        tooltip: 'Click to rename this cell',
      }),
    ];
  }

  refresh(): void {
    this._onDidChange.fire();
  }
}

/**
 * Draws a thin separator line and adds vertical breathing room between the
 * CodeLens cell header and the first line of code.
 */
export class CellSpacerDecorator implements vscode.Disposable {
  private readonly _lineType: vscode.TextEditorDecorationType;
  private readonly _spacerType: vscode.TextEditorDecorationType;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor() {
    // Separator line — explicit dark/light colors so it always renders
    this._lineType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      borderStyle: 'solid',
      borderWidth: '1px 0 0 0',
      dark:  { borderColor: 'rgba(255, 255, 255, 0.18)' },
      light: { borderColor: 'rgba(0, 0, 0, 0.18)' },
    });

    // Space above and below the separator for breathing room
    this._spacerType = vscode.window.createTextEditorDecorationType({
      before: {
        contentText: ' ',
        color: 'transparent',
        margin: '10px 0 10px 0',
      },
    });

    this._disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(() => this._applyAll()),
      vscode.workspace.onDidChangeNotebookDocument(() => this._applyAll()),
      vscode.window.onDidChangeActiveNotebookEditor(() => this._applyAll()),
      vscode.workspace.onDidOpenNotebookDocument(() => this._applyAll()),
    );

    this._applyAll();
  }

  private _applyAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.scheme !== 'vscode-notebook-cell') {
        editor.setDecorations(this._lineType, []);
        editor.setDecorations(this._spacerType, []);
        continue;
      }
      const line0 = new vscode.Range(0, 0, 0, 0);
      editor.setDecorations(this._lineType, [line0]);
      editor.setDecorations(this._spacerType, [line0]);
    }
  }

  refresh(): void {
    this._applyAll();
  }

  dispose(): void {
    this._lineType.dispose();
    this._spacerType.dispose();
    this._disposables.forEach(d => d.dispose());
  }
}

function getCellForDocument(document: vscode.TextDocument): vscode.NotebookCell | undefined {
  const uriStr = document.uri.toString();
  for (const nb of vscode.workspace.notebookDocuments) {
    for (let i = 0; i < nb.cellCount; i++) {
      const cell = nb.cellAt(i);
      if (cell.document.uri.toString() === uriStr) { return cell; }
    }
  }
  return undefined;
}
