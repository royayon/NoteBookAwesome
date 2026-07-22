import * as vscode from 'vscode';
import { CellCodeLensProvider, CellSpacerDecorator } from './cellDecorator';
import { NavigationPanelProvider } from './navigationPanel';
import { initCellNaming, getCellName, setCellName, getActiveCell } from './cellNaming';

const noopColorDecorator = { refresh() {} };

export function activate(context: vscode.ExtensionContext): void {
  initCellNaming(context);
  syncCodeLensFont();

  const codeLensProvider = new CellCodeLensProvider();
  const spacerDecorator = new CellSpacerDecorator();
  const panelProvider = new NavigationPanelProvider(context.extensionUri, noopColorDecorator);

  // Refresh immediately for any notebooks already open when the extension activates
  if (vscode.workspace.notebookDocuments.length > 0) {
    codeLensProvider.refresh();
    panelProvider.refresh();
  }

  context.subscriptions.push(
    spacerDecorator,

    // Cell header above each cell's code (CodeLens)
    vscode.languages.registerCodeLensProvider(
      { scheme: 'vscode-notebook-cell' },
      codeLensProvider,
    ),

    // Navigation panel (right-click the panel icon → Move to Secondary Side Bar)
    vscode.window.registerWebviewViewProvider(
      'notebookawesome.navigationPanel',
      panelProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),

    // Keep CodeLens font 2px above editor font whenever the editor font changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('editor.fontSize')) { syncCodeLensFont(); }
    }),

    // Refresh on notebook changes and opens
    vscode.workspace.onDidOpenNotebookDocument(() => {
      codeLensProvider.refresh();
      panelProvider.refresh();
    }),
    vscode.workspace.onDidChangeNotebookDocument(e => {
      // Track execution state first (targeted webview message, no full re-render)
      for (const change of e.cellChanges) {
        const cell = change.cell;
        const summary = cell.executionSummary;
        if (change.outputs !== undefined && change.outputs.length === 0) {
          panelProvider.updateCellExecState(cell, true);
        } else if (change.executionSummary !== undefined && summary?.success !== undefined) {
          panelProvider.updateCellExecState(cell, false);
        }
      }
      // Only do a full panel re-render for structural/content/metadata changes —
      // not for output-only changes during execution (avoids restarting the animation)
      const needsRefresh = e.contentChanges.length > 0
        || e.cellChanges.some(c => c.document !== undefined || c.metadata !== undefined);
      if (needsRefresh) {
        codeLensProvider.refresh();
        panelProvider.refresh();
      }
    }),
    vscode.window.onDidChangeActiveNotebookEditor(() => {
      codeLensProvider.refresh();
      panelProvider.refresh();
    }),

    // Command: rename the active/focused cell
    vscode.commands.registerCommand('notebookawesome.renameCell', async (cell?: vscode.NotebookCell) => {
      const target = cell ?? getActiveCell();
      if (!target) {
        vscode.window.showWarningMessage('NotebookAwesome: no cell is currently selected.');
        return;
      }
      await promptRename(target, codeLensProvider, panelProvider);
    }),

    // Command: rename cell by index (used from the nav panel)
    vscode.commands.registerCommand('notebookawesome.renameCellByIndex', async (index: number) => {
      const editor = vscode.window.activeNotebookEditor;
      if (!editor) { return; }
      const target = editor.notebook.cellAt(index);
      await promptRename(target, codeLensProvider, panelProvider);
    }),

    // Command: clear the name from the active/focused cell
    vscode.commands.registerCommand('notebookawesome.clearCellName', async (cell?: vscode.NotebookCell) => {
      const target = cell ?? getActiveCell();
      if (!target) { return; }
      await setCellName(target, undefined);
      codeLensProvider.refresh();
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

    // Command: open the nav panel
    vscode.commands.registerCommand('notebookawesome.openNavigator', () => {
      vscode.commands.executeCommand('notebookawesome.navigationPanel.focus');
    }),

    // Command: force-refresh the nav panel
    vscode.commands.registerCommand('notebookawesome.refreshPanel', () => {
      codeLensProvider.refresh();
      panelProvider.refresh();
    }),

    // Command: jump to a cell via QuickPick (Ctrl+Alt+G)
    vscode.commands.registerCommand('notebookawesome.jumpToCell', async () => {
      const editor = vscode.window.activeNotebookEditor;
      if (!editor) {
        vscode.window.showWarningMessage('NotebookAwesome: no notebook is open.');
        return;
      }
      const items: Array<vscode.QuickPickItem & { index: number }> = [];
      for (let i = 0; i < editor.notebook.cellCount; i++) {
        const cell = editor.notebook.cellAt(i);
        const name = getCellName(cell);
        const isCode = cell.kind === vscode.NotebookCellKind.Code;
        const firstLine = cell.document.getText().split('\n')[0].trim();
        items.push({
          label: name ? `${i + 1}: ${name}` : `Cell ${i + 1}`,
          description: isCode ? 'Code' : 'MD',
          detail: firstLine,
          index: i,
        });
      }
      const picked = await vscode.window.showQuickPick(items, {
        title: 'Jump to Cell',
        placeHolder: 'Type a cell number or name…',
        matchOnDetail: true,
      });
      if (picked) {
        vscode.commands.executeCommand('notebookawesome.navigateToCell', picked.index);
      }
    }),
  );
}

async function promptRename(
  cell: vscode.NotebookCell,
  codeLens: CellCodeLensProvider,
  panel: NavigationPanelProvider,
): Promise<void> {
  const current = getCellName(cell);
  const input = await vscode.window.showInputBox({
    title: `Rename Cell ${cell.index + 1}`,
    prompt: 'Enter a name for this cell. Leave empty to clear.',
    value: current ?? '',
    placeHolder: `Cell ${cell.index + 1}`,
    validateInput: v => (v.length > 120 ? 'Name must be 120 characters or fewer.' : undefined),
  });
  if (input === undefined) { return; }
  await setCellName(cell, input.trim() || undefined);
  codeLens.refresh();
  panel.refresh();
}

export function deactivate(): void {}

function syncCodeLensFont(): void {
  const config = vscode.workspace.getConfiguration('editor');
  const fontSize = config.get<number>('fontSize') ?? 14;
  config.update('codeLensFontSize', fontSize + 2, vscode.ConfigurationTarget.Workspace);
}
