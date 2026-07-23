import * as vscode from 'vscode';
import { getCellName, getCellColor, setCellColor, getColorPalette, PaletteEntry } from './cellNaming';

type Section = {
  heading: vscode.NotebookCell | null;
  headingIdx: number;
  children: Array<{ cell: vscode.NotebookCell; idx: number }>;
};

export class NavigationPanelProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private _view?: vscode.WebviewView;
  private _grouped = false;
  private readonly _disposables: vscode.Disposable[] = [];
  private readonly _runningCells = new Set<string>();
  private _lastEditor?: vscode.NotebookEditor;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _colorDecorator: { refresh(): void },
  ) {}

  updateCellExecState(cell: vscode.NotebookCell, running: boolean): void {
    const key = `${cell.notebook.uri}#${cell.index}`;
    if (running) {
      this._runningCells.add(key);
    } else {
      this._runningCells.delete(key);
    }
    let state = '';
    if (running) {
      state = 'running';
    } else if (cell.executionSummary?.success === true) {
      state = 'success';
    } else if (cell.executionSummary?.success === false) {
      state = 'failed';
    }
    this._view?.webview.postMessage({ type: 'setExecState', index: cell.index, state });
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    this._render();

    this._disposables.push(
      webviewView.webview.onDidReceiveMessage(async msg => {
        if (msg.type === 'navigateToCell') {
          vscode.commands.executeCommand('notebookawesome.navigateToCell', msg.index);
        } else if (msg.type === 'renameCell') {
          vscode.commands.executeCommand('notebookawesome.renameCellByIndex', msg.index);
        } else if (msg.type === 'setCellColor') {
          const editor = vscode.window.activeNotebookEditor ?? this._lastEditor;
          if (!editor) { return; }
          const cell = editor.notebook.cellAt(msg.index as number);
          await setCellColor(cell, (msg.colorName as string | null) || undefined);
          this._colorDecorator.refresh();
          this._render();
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
    if (editor) { this._lastEditor = editor; }
    const active = editor ?? this._lastEditor;
    const cells: vscode.NotebookCell[] = active
      ? Array.from({ length: active.notebook.cellCount }, (_, i) => active.notebook.cellAt(i))
      : [];
    this._view.webview.html = buildHtml(cells, this._grouped, getColorPalette(), this._runningCells);
  }

  dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function execState(cell: vscode.NotebookCell, runningCells: Set<string>): string {
  if (runningCells.has(`${cell.notebook.uri}#${cell.index}`)) { return 'running'; }
  if (cell.executionSummary?.success === true)  { return 'success'; }
  if (cell.executionSummary?.success === false) { return 'failed'; }
  return '';
}

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

function cellRow(cell: vscode.NotebookCell, idx: number, palette: Map<string, string>, runningCells: Set<string>, extraClass = ''): string {
  const name = getCellName(cell);
  const isCode = cell.kind === vscode.NotebookCellKind.Code;
  const isHeadingMd = !isCode && cell.document.getText().trimStart().startsWith('#');
  const label = escapeHtml(
    name           ? `${idx + 1}: ${name}`
    : isHeadingMd ? headingText(cell)
    :               `Cell ${idx + 1}`,
  );
  const cls = extraClass ? ` ${extraClass}` : '';
  const colorName = getCellColor(cell);
  const colorHex = colorName ? palette.get(colorName) : undefined;
  const edgeStyle = colorHex ? ` style="border-left: 3px solid ${colorHex}"` : '';
  const dotStyle = colorHex ? ` style="color: ${colorHex}; opacity: 1"` : '';
  const exec = execState(cell, runningCells);
  const execAttr = exec ? ` data-exec="${exec}"` : '';
  const labelCls = isCode ? 'label' : 'label md-label';
  return `<div class="row${cls}" data-index="${idx}" data-type="${isCode ? 'code' : 'md'}" data-color="${escapeHtml(colorName ?? '')}"${execAttr}${edgeStyle} onclick="navigate(${idx})">
  <span class="${labelCls}" ondblclick="event.stopPropagation();renameCell(${idx})" title="Double-click to rename">${label}</span>
  ${isCode ? '<span class="exec-bar"></span>' : '<span class="exec-spacer"></span>'}
  <button class="color-btn" title="Set cell color"${dotStyle} onclick="event.stopPropagation();openColorPicker(${idx}, this)">●</button>
</div>`;
}

function sectionHtml(sections: Section[], palette: Map<string, string>, runningCells: Set<string>): string {
  return sections.map((sec, si) => {
    if (sec.heading === null) {
      // Preamble cells before the first heading — flat, no collapse
      return sec.children.map(({ cell, idx }) => cellRow(cell, idx, palette, runningCells)).join('\n');
    }

    const name = getCellName(sec.heading);
    const hlabel = name
      ? escapeHtml(`${sec.headingIdx + 1}: ${name}`)
      : escapeHtml(headingText(sec.heading));
    const childRows = sec.children.map(({ cell, idx }) => cellRow(cell, idx, palette, runningCells, 'child')).join('\n');

    return `<div class="section" id="sec-${si}">
  <div class="sec-hdr" onclick="navigate(${sec.headingIdx})">
    <span class="chevron" onclick="event.stopPropagation();toggleSection(${si})">▾</span>
    <span class="sec-label" ondblclick="event.stopPropagation();renameCell(${sec.headingIdx})" title="Double-click to rename">${hlabel}</span>
  </div>
  <div class="sec-body" id="sec-body-${si}">
${childRows}
  </div>
</div>`;
  }).join('\n');
}

// ─── HTML ─────────────────────────────────────────────────────────────────────

function buildHtml(cells: vscode.NotebookCell[], grouped: boolean, paletteEntries: PaletteEntry[], runningCells: Set<string>): string {
  const palette = new Map(paletteEntries.map(p => [p.name, p.color]));
  const flatRows = cells.map((cell, i) => cellRow(cell, i, palette, runningCells)).join('\n');
  const groupedRows = grouped ? sectionHtml(buildSections(cells), palette, runningCells) : '';
  const paletteDots = paletteEntries.map(p =>
    `<button class="palette-dot" data-color="${escapeHtml(p.name)}" title="Show only ${escapeHtml(p.name)} cells" style="color: ${p.color}" onclick="setColorFilter('${escapeHtml(p.name)}')">●</button>`
  ).join('');
  const popupDots = paletteEntries.map(p =>
    `<button class="cp-dot" title="${escapeHtml(p.name)}" style="color:${p.color}" onclick="applyColorFromPicker('${escapeHtml(p.name)}')">●</button>`
  ).join('');
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
  .md-label { font-weight: 600; }

  .color-btn { background: none; border: none; color: var(--vscode-foreground); cursor: pointer; opacity: 0.3; padding: 2px 4px; font-size: 11px; border-radius: 3px; transition: opacity 0.15s, background 0.15s; flex-shrink: 0; }
  .row:hover .color-btn { opacity: 0.7; }
  .color-btn:hover { opacity: 1 !important; background: var(--vscode-toolbar-hoverBackground); }

  .palette-strip { display: none; align-items: center; gap: 2px; justify-content: flex-end; padding: 3px 8px; border-bottom: 1px solid var(--vscode-widget-border, #333); }
  .palette-strip.open { display: flex; }
  .palette-dot { background: none; border: 1px solid transparent; cursor: pointer; padding: 1px 4px; font-size: 13px; border-radius: 3px; opacity: 0.75; transition: opacity 0.15s, border-color 0.15s; }
  .palette-dot:hover { opacity: 1; }
  .palette-dot.active { opacity: 1; border-color: var(--vscode-focusBorder, #007fd4); }
  .palette-all { background: none; border: 1px solid transparent; color: var(--vscode-foreground); cursor: pointer; padding: 1px 6px; font-size: 10px; border-radius: 3px; opacity: 0.65; }
  .palette-all:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }

  .sec-hdr { display: flex; align-items: center; gap: 6px; padding: 5px 8px; cursor: pointer; border-bottom: 1px solid var(--vscode-widget-border, #333); background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.08)); user-select: none; }
  .sec-hdr:hover { background: var(--vscode-list-hoverBackground); }
  .chevron { font-size: 10px; flex-shrink: 0; width: 12px; text-align: center; cursor: pointer; }
  .sec-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }

  .empty { padding: 16px 10px; color: var(--vscode-descriptionForeground); font-style: italic; font-size: 12px; text-align: center; }

  /* execution state indicator — short bar on right side, code cells only */
  .exec-bar { flex-shrink: 0; width: 18px; height: 2px; border-radius: 2px; background: rgba(128,128,128,0.22); }
  .exec-spacer { flex-shrink: 0; width: 18px; }
  .row[data-exec="running"] .exec-bar { background: #4ade80; animation: nba-pulse 0.9s ease-in-out infinite; }
  .row[data-exec="success"] .exec-bar { background: rgba(74,222,128,0.8); }
  .row[data-exec="failed"]  .exec-bar { background: rgba(248,113,113,0.9); }
  @keyframes nba-pulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 1; box-shadow: 0 0 5px rgba(74,222,128,0.7); }
  }

  .color-popup { position: fixed; display: none; align-items: center; gap: 4px; padding: 5px 8px; background: var(--vscode-quickInput-background, #1e1e1e); border: 1px solid var(--vscode-focusBorder, #007fd4); border-radius: 8px; z-index: 1000; box-shadow: 0 4px 14px rgba(0,0,0,0.5); }
  .color-popup.open { display: flex; }
  .cp-dot { background: none; border: 1px solid transparent; cursor: pointer; padding: 2px 4px; font-size: 16px; border-radius: 4px; line-height: 1; transition: transform 0.1s, border-color 0.1s; }
  .cp-dot:hover { transform: scale(1.2); border-color: var(--vscode-focusBorder, #007fd4); }
  .cp-clear { background: none; border: none; color: var(--vscode-foreground); cursor: pointer; padding: 2px 5px; font-size: 11px; border-radius: 3px; opacity: 0.5; }
  .cp-clear:hover { opacity: 1; background: var(--vscode-toolbar-hoverBackground); }
</style>
</head>
<body>
<div class="toolbar">
  <button class="toolbar-btn" id="btn-color" title="Filter by color" onclick="togglePaletteStrip()">● Color</button>
  <span class="toolbar-sep"></span>
  <button class="toolbar-btn${grouped ? ' active' : ''}" id="btn-group" title="${grouped ? 'Switch to flat list' : 'Group cells by headings'}" onclick="toggleGrouping()">⊞ Group</button>
  <span class="toolbar-sep"></span>
  <button class="toolbar-btn" id="btn-code" title="Show only code cells" onclick="setFilter('code')">Code</button>
  <button class="toolbar-btn" id="btn-md" title="Show only markdown cells" onclick="setFilter('md')">MD</button>
</div>
<div class="palette-strip" id="palette-strip">
  <button class="palette-all" onclick="setColorFilter('')">All</button>
  ${paletteDots}
</div>
<div class="search-wrap">
  <input class="search-input" id="search" type="text" placeholder="Search by cell number or name…" oninput="filterRows(this.value)" />
</div>
${emptyMsg}
<div id="flat-list"${grouped ? ' style="display:none"' : ''}>${flatRows}</div>
<div id="grouped-list"${grouped ? '' : ' style="display:none"'}>${groupedRows}</div>
<div id="color-popup" class="color-popup">
  <button class="cp-clear" title="Clear color" onclick="applyColorFromPicker(null)">✕</button>
  ${popupDots}
</div>
<script>
  const vscode = acquireVsCodeApi();
  let _sel = -1;
  const _grouped = ${grouped};
  let _filter = 'all'; // 'all' | 'code' | 'md'
  let _colorFilter = ''; // '' = all colors, otherwise a palette color name

  let _pickerTarget = -1;

  function navigate(index) { vscode.postMessage({ type: 'navigateToCell', index }); }
  function renameCell(index) { vscode.postMessage({ type: 'renameCell', index }); }
  function toggleGrouping() { vscode.postMessage({ type: 'toggleGrouping' }); }

  function openColorPicker(index, btn) {
    _pickerTarget = index;
    const popup = document.getElementById('color-popup');
    // Reset position so getBoundingClientRect measures true size, not stale coords
    popup.style.left = '0px';
    popup.style.top = '0px';
    popup.classList.add('open');
    const rect = btn.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    // Right-align popup with button's right edge, but clamp so it never overflows
    let left = rect.right - popupRect.width;
    left = Math.max(4, Math.min(left, window.innerWidth - popupRect.width - 4));
    // Below the button; flip above if it would clip the bottom
    let top = rect.bottom + 4;
    if (top + popupRect.height > window.innerHeight - 4) { top = rect.top - popupRect.height - 4; }
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
  }

  function applyColorFromPicker(colorName) {
    document.getElementById('color-popup').classList.remove('open');
    if (_pickerTarget < 0) { return; }
    vscode.postMessage({ type: 'setCellColor', index: _pickerTarget, colorName: colorName });
    _pickerTarget = -1;
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('#color-popup')) {
      document.getElementById('color-popup').classList.remove('open');
      _pickerTarget = -1;
    }
  });

  function setFilter(type) {
    _filter = _filter === type ? 'all' : type;
    document.getElementById('btn-code').classList.toggle('active', _filter === 'code');
    document.getElementById('btn-md').classList.toggle('active', _filter === 'md');
    filterRows(document.getElementById('search').value);
  }

  function togglePaletteStrip() {
    const strip = document.getElementById('palette-strip');
    const isOpen = strip.classList.contains('open');
    strip.classList.toggle('open');
    if (isOpen && _colorFilter) {
      setColorFilter('');
    }
  }

  function setColorFilter(colorName) {
    _colorFilter = _colorFilter === colorName ? '' : colorName;
    document.querySelectorAll('.palette-dot').forEach(d =>
      d.classList.toggle('active', d.dataset.color === _colorFilter && _colorFilter !== ''));
    document.getElementById('btn-color').classList.toggle('active', _colorFilter !== '');
    filterRows(document.getElementById('search').value);
  }

  function rowVisible(row, q) {
    const textMatch = !q || row.querySelector('.label').textContent.toLowerCase().includes(q);
    if (!textMatch) { return false; }
    if (_colorFilter && row.dataset.color !== _colorFilter) { return false; }
    if (_filter === 'all') { return true; }
    const isCode = row.dataset.type === 'code';
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

      if (!q && _filter === 'all' && !_colorFilter) {
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

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'setExecState') {
      document.querySelectorAll('.row[data-index="' + msg.index + '"]').forEach(row => {
        if (msg.state) { row.setAttribute('data-exec', msg.state); }
        else { row.removeAttribute('data-exec'); }
      });
    }
  });

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
