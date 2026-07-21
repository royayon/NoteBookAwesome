import * as vscode from 'vscode';
import { getCellName } from './cellNaming';

export class CellHeaderDecorator implements vscode.Disposable {
  private readonly _decorationType: vscode.TextEditorDecorationType;
  private readonly _statusBarProvider: CellStatusBarProvider;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor() {
    this._decorationType = vscode.window.createTextEditorDecorationType({});
    this._statusBarProvider = new CellStatusBarProvider();

    this._disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(() => this.decorateAll()),
      vscode.workspace.onDidChangeNotebookDocument(() => this.decorateAll()),
      vscode.window.onDidChangeActiveNotebookEditor(() => this.decorateAll()),
    );

    this.decorateAll();
  }

  decorateAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      const cell = getCellForEditor(editor);
      if (!cell) {
        // Clear any leftover decorations from non-notebook editors
        editor.setDecorations(this._decorationType, []);
        continue;
      }
      this._applyDecoration(editor, cell);
    }
  }

  private _applyDecoration(editor: vscode.TextEditor, cell: vscode.NotebookCell): void {
    const index = cell.index + 1;
    const name = getCellName(cell);
    const label = name ? `${index}: ${name}` : `Cell ${index}`;

    editor.setDecorations(this._decorationType, [
      {
        range: new vscode.Range(0, 0, 0, 0),
        renderOptions: {
          before: {
            contentText: `  ${label}  `,
            color: new vscode.ThemeColor('notebookStatusRunningIcon.foreground'),
            backgroundColor: new vscode.ThemeColor('badge.background'),
            margin: '0 8px 4px 0',
            fontWeight: '600',
            fontStyle: 'normal',
          },
        },
      },
    ]);
  }

  refresh(): void {
    this.decorateAll();
    this._statusBarProvider.refresh();
  }

  getStatusBarProvider(): CellStatusBarProvider {
    return this._statusBarProvider;
  }

  dispose(): void {
    this._decorationType.dispose();
    this._disposables.forEach(d => d.dispose());
  }
}

/** Provides a clickable rename button in each cell's status bar strip. */
export class CellStatusBarProvider implements vscode.NotebookCellStatusBarItemProvider {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeCellStatusBarItems = this._onDidChange.event;

  provideCellStatusBarItems(cell: vscode.NotebookCell): vscode.NotebookCellStatusBarItem[] {
    const name = getCellName(cell);
    const renameItem = new vscode.NotebookCellStatusBarItem(
      name ? '$(edit) Rename' : '$(tag) Name cell',
      vscode.NotebookCellStatusBarAlignment.Left,
    );
    renameItem.command = {
      title: 'Rename Cell',
      command: 'notebookawesome.renameCell',
    };
    renameItem.tooltip = 'NotebookAwesome: rename this cell';
    return [renameItem];
  }

  refresh(): void {
    this._onDidChange.fire();
  }
}

function getCellForEditor(editor: vscode.TextEditor): vscode.NotebookCell | undefined {
  if (editor.document.uri.scheme !== 'vscode-notebook-cell') { return undefined; }
  const editorUriStr = editor.document.uri.toString();
  for (const notebookEditor of vscode.window.visibleNotebookEditors) {
    const nb = notebookEditor.notebook;
    for (let i = 0; i < nb.cellCount; i++) {
      const cell = nb.cellAt(i);
      if (cell.document.uri.toString() === editorUriStr) {
        return cell;
      }
    }
  }
  return undefined;
}
