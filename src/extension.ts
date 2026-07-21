import * as vscode from 'vscode';
import { CellHeaderDecorator } from './cellDecorator';
import { NavigationPanelProvider } from './navigationPanel';
import { getCellName, setCellName, getActiveCell } from './cellNaming';

export function activate(context: vscode.ExtensionContext): void {
  const decorator = new CellHeaderDecorator();
  const panelProvider = new NavigationPanelProvider(context.extensionUri);

  context.subscriptions.push(
    decorator,
    panelProvider,

    vscode.notebooks.registerNotebookCellStatusBarItemProvider(
      'jupyter-notebook',
      decorator.getStatusBarProvider(),
    ),

    vscode.window.registerWebviewViewProvider(
      'notebookawesome.navigationPanel',
      panelProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),

    // Refresh on notebook changes
    vscode.workspace.onDidChangeNotebookDocument(() => {
      decorator.refresh();
      panelProvider.refresh();
    }),
    vscode.window.onDidChangeActiveNotebookEditor(() => {
      decorator.refresh();
      panelProvider.refresh();
    }),

    // Command: rename the active/focused cell
    vscode.commands.registerCommand('notebookawesome.renameCell', async (cell?: vscode.NotebookCell) => {
      const target = cell ?? getActiveCell();
      if (!target) {
        vscode.window.showWarningMessage('NotebookAwesome: no cell is currently selected.');
        return;
      }
      await promptRename(target, decorator, panelProvider);
    }),

    // Command: rename cell by index (used from the nav panel)
    vscode.commands.registerCommand('notebookawesome.renameCellByIndex', async (index: number) => {
      const editor = vscode.window.activeNotebookEditor;
      if (!editor) { return; }
      const target = editor.notebook.cellAt(index);
      await promptRename(target, decorator, panelProvider);
    }),

    // Command: clear the name from the active/focused cell
    vscode.commands.registerCommand('notebookawesome.clearCellName', async (cell?: vscode.NotebookCell) => {
      const target = cell ?? getActiveCell();
      if (!target) { return; }
      await setCellName(target, undefined);
      decorator.refresh();
      panelProvider.refresh();
    }),

    // Command: navigate to a cell by index
    vscode.commands.registerCommand('notebookawesome.navigateToCell', (index: number) => {
      const editor = vscode.window.activeNotebookEditor;
      if (!editor) { return; }
      const range = new vscode.NotebookRange(index, index + 1);
      editor.revealRange(range, vscode.NotebookEditorRevealType.InCenterIfOutsideViewport);
      editor.selection = range;
    }),

    // Command: force-refresh the nav panel
    vscode.commands.registerCommand('notebookawesome.refreshPanel', () => {
      decorator.refresh();
      panelProvider.refresh();
    }),
  );
}

async function promptRename(
  cell: vscode.NotebookCell,
  decorator: CellHeaderDecorator,
  panelProvider: NavigationPanelProvider,
): Promise<void> {
  const current = getCellName(cell);
  const input = await vscode.window.showInputBox({
    title: `Rename Cell ${cell.index + 1}`,
    prompt: 'Enter a name for this cell. Leave empty to clear the name.',
    value: current ?? '',
    placeHolder: `Cell ${cell.index + 1}`,
    validateInput: v => (v.length > 120 ? 'Name must be 120 characters or fewer.' : undefined),
  });
  if (input === undefined) { return; } // user cancelled
  await setCellName(cell, input.trim() || undefined);
  decorator.refresh();
  panelProvider.refresh();
}

export function deactivate(): void {}
