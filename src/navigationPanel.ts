import * as vscode from 'vscode';
import { getCellName } from './cellNaming';

export class NavigationPanelProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private _view?: vscode.WebviewView;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    this._render();

    this._disposables.push(
      webviewView.webview.onDidReceiveMessage(msg => {
        if (msg.type === 'navigateToCell') {
          vscode.commands.executeCommand('notebookawesome.navigateToCell', msg.index);
        } else if (msg.type === 'renameCell') {
          vscode.commands.executeCommand('notebookawesome.renameCellByIndex', msg.index);
        }
      }),
      webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible) { this._render(); }
      }),
    );
  }

  refresh(): void {
    if (this._view?.visible) { this._render(); }
  }

  private _render(): void {
    if (!this._view) { return; }
    const editor = vscode.window.activeNotebookEditor;
    const cells: vscode.NotebookCell[] = editor
      ? Array.from({ length: editor.notebook.cellCount }, (_, i) => editor.notebook.cellAt(i))
      : [];
    this._view.webview.html = buildHtml(cells);
  }

  dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}

function buildHtml(cells: vscode.NotebookCell[]): string {
  const rows = cells
    .map((cell, i) => {
      const name = getCellName(cell);
      const label = escapeHtml(name ? `${i + 1}: ${name}` : `Cell ${i + 1}`);
      const isCode = cell.kind === vscode.NotebookCellKind.Code;
      const typeCls = isCode ? 'code' : 'md';
      const typeText = isCode ? 'Code' : 'MD';
      return `<div class="row" data-index="${i}" onclick="navigate(${i})">
  <span class="label" ondblclick="event.stopPropagation();renameCell(${i})" title="Double-click to rename">${label}</span>
  <span class="badge ${typeCls}">${typeText}</span>
  <button class="rename-btn" title="Rename cell" onclick="event.stopPropagation();renameCell(${i})">✏</button>
</div>`;
    })
    .join('\n');

  const emptyMsg =
    cells.length === 0
      ? '<p class="empty">Open a Jupyter notebook (.ipynb) to see cells here.</p>'
      : '';

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
  }
  .search-wrap {
    padding: 6px 8px;
    border-bottom: 1px solid var(--vscode-widget-border, #333);
    position: sticky;
    top: 0;
    background: var(--vscode-sideBar-background);
    z-index: 10;
  }
  .search-input {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, #555);
    border-radius: 3px;
    padding: 4px 8px;
    font-size: 12px;
    font-family: var(--vscode-font-family);
    outline: none;
  }
  .search-input::placeholder { color: var(--vscode-input-placeholderForeground); }
  .search-input:focus { border-color: var(--vscode-focusBorder, #007fd4); }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    cursor: pointer;
    border-bottom: 1px solid var(--vscode-widget-border, #333);
    user-select: none;
  }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row.selected { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  .row:active { background: var(--vscode-list-activeSelectionBackground); }
  .label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
  .badge {
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .badge.code {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }
  .badge.md {
    background: var(--vscode-inputValidation-infoBackground, #1a3a5c);
    color: var(--vscode-inputValidation-infoForeground, #9cdcfe);
  }
  .rename-btn {
    background: none;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    opacity: 0.3;
    padding: 2px 4px;
    font-size: 11px;
    border-radius: 3px;
    transition: opacity 0.15s, background 0.15s;
    flex-shrink: 0;
  }
  .row:hover .rename-btn { opacity: 0.7; }
  .rename-btn:hover {
    opacity: 1 !important;
    background: var(--vscode-toolbar-hoverBackground);
  }
  .empty {
    padding: 16px 10px;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    font-size: 12px;
    text-align: center;
  }
</style>
</head>
<body>
<div class="search-wrap">
  <input class="search-input" id="search" type="text" placeholder="Search by cell number or name…" oninput="filterRows(this.value)" />
</div>
${emptyMsg}${rows}
<script>
  const vscode = acquireVsCodeApi();
  function navigate(index) {
    vscode.postMessage({ type: 'navigateToCell', index });
  }
  function renameCell(index) {
    vscode.postMessage({ type: 'renameCell', index });
  }
  let _sel = -1;

  function visibleRows() {
    return Array.from(document.querySelectorAll('.row')).filter(r => r.style.display !== 'none');
  }

  function setSelected(idx) {
    const rows = visibleRows();
    _sel = Math.max(0, Math.min(idx, rows.length - 1));
    rows.forEach((r, i) => r.classList.toggle('selected', i === _sel));
    if (rows[_sel]) { rows[_sel].scrollIntoView({ block: 'nearest' }); }
  }

  function filterRows(query) {
    _sel = -1;
    const q = query.trim().toLowerCase();
    document.querySelectorAll('.row').forEach(row => {
      row.classList.remove('selected');
      const label = row.querySelector('.label').textContent.toLowerCase();
      row.style.display = (!q || label.includes(q)) ? '' : 'none';
    });
  }

  document.getElementById('search').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(_sel + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(_sel - 1);
    } else if (e.key === 'Enter') {
      const rows = visibleRows();
      const target = rows[_sel] ?? rows[0];
      if (target) { navigate(parseInt(target.dataset.index, 10)); }
    } else if (e.key === 'Escape') {
      document.getElementById('search').value = '';
      filterRows('');
    }
  });
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
