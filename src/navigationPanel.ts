import * as vscode from 'vscode';
import { getCellName } from './cellNaming';

type Section = {
  heading: vscode.NotebookCell | null;
  headingIdx: number;
  children: Array<{ cell: vscode.NotebookCell; idx: number }>;
};

export class NavigationPanelProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private _view?: vscode.WebviewView;
  private _grouped = false;
  private readonly _disposables: vscode.Disposable[] = [];

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    this._render();

    this._disposables.push(
      webviewView.webview.onDidReceiveMessage(msg => {
        if (msg.type === 'navigateToCell') {
          vscode.commands.executeCommand('notebookawesome.navigateToCell', msg.index);
        } else if (msg.type === 'renameCell') {
          vscode.commands.executeCommand('notebookawesome.renameCellByIndex', msg.index);
        } else if (msg.type === 'toggleGrouping') {
          this._grouped = !this._grouped;
          this._render();
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
    this._view.webview.html = buildHtml(cells, this._grouped);
  }

  dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildSections(cells: vscode.NotebookCell[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, headingIdx: -1, children: [] };

  cells.forEach((cell, idx) => {
    const isHeading =
      cell.kind === vscode.NotebookCellKind.Markup &&
      cell.document.getText().trimStart().startsWith('#');

    if (isHeading) {
      if (current.heading !== null || current.children.length > 0) {
        sections.push(current);
      }
      current = { heading: cell, headingIdx: idx, children: [] };
    } else {
      current.children.push({ cell, idx });
    }
  });

  if (current.heading !== null || current.children.length > 0) {
    sections.push(current);
  }

  return sections;
}

function headingText(cell: vscode.NotebookCell): string {
  return cell.document.getText().split('\n')[0].replace(/^#+\s*/, '').trim();
}

function cellRow(cell: vscode.NotebookCell, idx: number, extraClass = ''): string {
  const name = getCellName(cell);
  const isHeadingMd =
    cell.kind === vscode.NotebookCellKind.Markup &&
    cell.document.getText().trimStart().startsWith('#');
  const label = escapeHtml(
    name            ? `${idx + 1}: ${name}`
    : isHeadingMd  ? headingText(cell)
    :                `Cell ${idx + 1}`,
  );
  const isCode = cell.kind === vscode.NotebookCellKind.Code;
  const badgeCls = isCode ? 'code' : 'md';
  const badgeText = isCode ? 'Code' : 'MD';
  const cls = extraClass ? ` ${extraClass}` : '';
  return `<div class="row${cls}" data-index="${idx}" onclick="navigate(${idx})">
  <span class="label" ondblclick="event.stopPropagation();renameCell(${idx})" title="Double-click to rename">${label}</span>
  <span class="badge ${badgeCls}">${badgeText}</span>
  <button class="rename-btn" title="Rename cell" onclick="event.stopPropagation();renameCell(${idx})">✏</button>
</div>`;
}

function sectionHtml(sections: Section[]): string {
  return sections.map((sec, si) => {
    if (sec.heading === null) {
      // Preamble cells before the first heading — flat, no collapse
      return sec.children.map(({ cell, idx }) => cellRow(cell, idx)).join('\n');
    }

    const name = getCellName(sec.heading);
    const hlabel = name
      ? escapeHtml(`${sec.headingIdx + 1}: ${name}`)
      : escapeHtml(headingText(sec.heading));
    const childRows = sec.children.map(({ cell, idx }) => cellRow(cell, idx, 'child')).join('\n');

    return `<div class="section" id="sec-${si}">
  <div class="sec-hdr" onclick="navigate(${sec.headingIdx})">
    <span class="chevron" onclick="event.stopPropagation();toggleSection(${si})">▾</span>
    <span class="sec-label">${hlabel}</span>
    <span class="badge md">MD</span>
    <button class="rename-btn" title="Rename heading" onclick="event.stopPropagation();renameCell(${sec.headingIdx})">✏</button>
  </div>
  <div class="sec-body" id="sec-body-${si}">
${childRows}
  </div>
</div>`;
  }).join('\n');
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildHtml(cells: vscode.NotebookCell[], grouped: boolean): string {
  const flatRows = cells.map((cell, i) => cellRow(cell, i)).join('\n');
  const groupedRows = grouped ? sectionHtml(buildSections(cells)) : '';
  const emptyMsg = cells.length === 0
    ? '<p class="empty">Open a Jupyter notebook (.ipynb) to see cells here.</p>'
    : '';

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }

  .toolbar { display: flex; align-items: center; gap: 4px; justify-content: flex-end; padding: 4px 8px; border-bottom: 1px solid var(--vscode-widget-border, #333); }
  .toolbar-btn { background: none; border: 1px solid transparent; color: var(--vscode-foreground); cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 11px; opacity: 0.65; transition: opacity 0.15s, background 0.15s, border-color 0.15s; }
  .toolbar-btn:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
  .toolbar-btn.active { opacity: 1; border-color: var(--vscode-focusBorder, #007fd4); background: var(--vscode-toolbar-activeBackground, rgba(0,127,212,0.15)); }
  .toolbar-sep { width: 1px; height: 14px; background: var(--vscode-widget-border, #555); flex-shrink: 0; }

  .search-wrap { padding: 6px 8px; border-bottom: 1px solid var(--vscode-widget-border, #333); position: sticky; top: 0; background: var(--vscode-sideBar-background); z-index: 10; }
  .search-input { width: 100%; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #555); border-radius: 3px; padding: 4px 8px; font-size: 12px; font-family: var(--vscode-font-family); outline: none; }
  .search-input::placeholder { color: var(--vscode-input-placeholderForeground); }
  .search-input:focus { border-color: var(--vscode-focusBorder, #007fd4); }

  .row { display: flex; align-items: center; gap: 6px; padding: 5px 8px; cursor: pointer; border-bottom: 1px solid var(--vscode-widget-border, #333); user-select: none; }
  .row.child { padding-left: 28px; }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row.selected { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }

  .label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
  .badge { font-size: 10px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; font-weight: 600; letter-spacing: 0.02em; }
  .badge.code { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
  .badge.md { background: var(--vscode-inputValidation-infoBackground, #1a3a5c); color: var(--vscode-inputValidation-infoForeground, #9cdcfe); }

  .rename-btn { background: none; border: none; color: var(--vscode-foreground); cursor: pointer; opacity: 0.3; padding: 2px 4px; font-size: 11px; border-radius: 3px; transition: opacity 0.15s, background 0.15s; flex-shrink: 0; }
  .row:hover .rename-btn, .sec-hdr:hover .rename-btn { opacity: 0.7; }
  .rename-btn:hover { opacity: 1 !important; background: var(--vscode-toolbar-hoverBackground); }

  .sec-hdr { display: flex; align-items: center; gap: 6px; padding: 5px 8px; cursor: pointer; border-bottom: 1px solid var(--vscode-widget-border, #333); background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.08)); user-select: none; }
  .sec-hdr:hover { background: var(--vscode-list-hoverBackground); }
  .chevron { font-size: 10px; flex-shrink: 0; width: 12px; text-align: center; cursor: pointer; }
  .sec-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }

  .empty { padding: 16px 10px; color: var(--vscode-descriptionForeground); font-style: italic; font-size: 12px; text-align: center; }
</style>
</head>
<body>
<div class="toolbar">
  <button class="toolbar-btn${grouped ? ' active' : ''}" id="btn-group" title="${grouped ? 'Switch to flat list' : 'Group cells by headings'}" onclick="toggleGrouping()">⊞ Group</button>
  <span class="toolbar-sep"></span>
  <button class="toolbar-btn" id="btn-code" title="Show only code cells" onclick="setFilter('code')">Code</button>
  <button class="toolbar-btn" id="btn-md" title="Show only markdown cells" onclick="setFilter('md')">MD</button>
</div>
<div class="search-wrap">
  <input class="search-input" id="search" type="text" placeholder="Search by cell number or name…" oninput="filterRows(this.value)" />
</div>
${emptyMsg}
<div id="flat-list"${grouped ? ' style="display:none"' : ''}>${flatRows}</div>
<div id="grouped-list"${grouped ? '' : ' style="display:none"'}>${groupedRows}</div>
<script>
  const vscode = acquireVsCodeApi();
  let _sel = -1;
  const _grouped = ${grouped};
  let _filter = 'all'; // 'all' | 'code' | 'md'

  function navigate(index) { vscode.postMessage({ type: 'navigateToCell', index }); }
  function renameCell(index) { vscode.postMessage({ type: 'renameCell', index }); }
  function toggleGrouping() { vscode.postMessage({ type: 'toggleGrouping' }); }

  function setFilter(type) {
    _filter = _filter === type ? 'all' : type;
    document.getElementById('btn-code').classList.toggle('active', _filter === 'code');
    document.getElementById('btn-md').classList.toggle('active', _filter === 'md');
    filterRows(document.getElementById('search').value);
  }

  function rowVisible(row, q) {
    const textMatch = !q || row.querySelector('.label').textContent.toLowerCase().includes(q);
    if (!textMatch) { return false; }
    if (_filter === 'all') { return true; }
    const isCode = row.querySelector('.badge')?.classList.contains('code') ?? false;
    return _filter === 'code' ? isCode : !isCode;
  }

  function toggleSection(id) {
    const body = document.getElementById('sec-body-' + id);
    const chev = document.querySelector('#sec-' + id + ' .chevron');
    const wasCollapsed = body.style.display === 'none';
    body.style.display = wasCollapsed ? '' : 'none';
    if (chev) { chev.textContent = wasCollapsed ? '▾' : '▸'; }
  }

  function visibleRows() {
    return Array.from(document.querySelectorAll('#flat-list .row')).filter(r => r.style.display !== 'none');
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
    const flat = document.getElementById('flat-list');
    const grp  = document.getElementById('grouped-list');

    if (_grouped) {
      // Always keep the grouped view; filter within it
      flat.style.display = 'none';
      grp.style.display  = '';

      if (!q && _filter === 'all') {
        // Nothing active — restore everything
        grp.querySelectorAll('.section').forEach(s => s.style.display = '');
        grp.querySelectorAll('.sec-body').forEach(b => b.style.display = '');
        grp.querySelectorAll('.row').forEach(r => { r.style.display = ''; r.classList.remove('selected'); });
        return;
      }

      // Filter sections: heading text is searchable; type filter applies to children
      grp.querySelectorAll('.section').forEach(section => {
        const secLabel = section.querySelector('.sec-label');
        const body     = section.querySelector('.sec-body');
        const hdrTextMatch = !q || (secLabel && secLabel.textContent.toLowerCase().includes(q));

        let anyChildVisible = false;
        body.querySelectorAll('.row').forEach(r => {
          // If heading matched by text, only apply type filter to children
          const visible = hdrTextMatch ? rowVisible(r, '') : rowVisible(r, q);
          r.style.display = visible ? '' : 'none';
          if (visible) { anyChildVisible = true; }
        });

        // Show section if heading matched (with type filter on children) OR children matched
        const showSection = (hdrTextMatch && anyChildVisible) || (!hdrTextMatch && anyChildVisible);
        section.style.display = showSection ? '' : 'none';
        if (showSection) { body.style.display = ''; }
      });

      // Preamble rows
      grp.querySelectorAll(':scope > .row').forEach(r => {
        r.style.display = rowVisible(r, q) ? '' : 'none';
        r.classList.remove('selected');
      });
      return;
    }

    // Flat mode — filter rows directly
    document.querySelectorAll('#flat-list .row').forEach(row => {
      row.classList.remove('selected');
      row.style.display = rowVisible(row, q) ? '' : 'none';
    });
  }

  document.getElementById('search').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(_sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(_sel - 1); }
    else if (e.key === 'Enter') {
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
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
