import { CellInfo, DEFAULT_COLOR_PALETTE } from '../types';
import { NotebookAdapter } from '../adapters/baseAdapter';
import { parseRunSequenceSpec } from '../core/runSequence';

interface Section {
  heading: CellInfo | null;
  headingIdx: number;
  children: CellInfo[];
}

interface SeqItem {
  name: string;
  spec: string;
  status: '' | 'running' | 'success' | 'failed';
}

export class NavigatorPanel {
  private container: HTMLElement;
  private adapter: NotebookAdapter;
  private grouped = false;
  private seqPanelOpen = true;
  private colorStripOpen = false;
  private filterColor = '';
  private filterType: 'all' | 'code' | 'markdown' = 'all';
  private filterText = '';
  private activeColorPickerCellIndex: number | null = null;
  private collapsedSections = new Set<number>();
  private sequences: SeqItem[] = [
    { name: 'Feature Analysis', spec: '2, 3, 4, 5, 6, 7, 8, 9, 10', status: '' }
  ];

  constructor(adapter: NotebookAdapter) {
    this.adapter = adapter;
    this.container = document.createElement('div');
    this.container.className = 'nba-navigator-panel';
  }

  public getElement(): HTMLElement {
    this.render();
    return this.container;
  }

  public refresh(): void {
    this.render();
  }

  private render(): void {
    const cells = this.adapter.getCells();

    this.container.innerHTML = `
      <!-- Toolbar Header -->
      <div class="toolbar">
        <button class="toolbar-btn ${this.colorStripOpen || this.filterColor ? 'active' : ''}" id="nba-btn-color" title="Filter by color tag">● Color</button>
        <button class="toolbar-btn ${this.grouped ? 'active' : ''}" id="nba-btn-group" title="Group by Markdown headings">⊞ Group</button>
        <button class="toolbar-btn ${this.seqPanelOpen ? 'active' : ''}" id="nba-btn-runs" title="Toggle custom run sequences">▶ Runs</button>
        <div class="toolbar-sep"></div>
        <button class="toolbar-btn ${this.filterType === 'code' ? 'active' : ''}" id="nba-btn-code" title="Show code cells only">Code</button>
        <button class="toolbar-btn ${this.filterType === 'markdown' ? 'active' : ''}" id="nba-btn-md" title="Show markdown cells only">MD</button>
      </div>

      <!-- Color Palette Filter Strip -->
      <div class="palette-strip ${this.colorStripOpen ? 'open' : ''}">
        ${DEFAULT_COLOR_PALETTE.map(p => `
          <button class="palette-dot ${this.filterColor === p.color ? 'active' : ''}" data-color="${p.color}" title="Show only ${p.name} cells" style="color: ${p.color}">●</button>
        `).join('')}
        <button class="palette-all" id="nba-color-all">All</button>
      </div>

      <!-- Run Sequences Panel -->
      <div class="seq-panel ${this.seqPanelOpen ? 'open' : ''}">
        ${this.sequences.map((s, i) => `
          <div class="seq-row" data-seq="${i}" data-result="${s.status}">
            <input class="seq-name" data-seq="${i}" placeholder="Name" value="${this.escapeHtml(s.name)}" />
            <input class="seq-nums" data-seq="${i}" placeholder="2, 3, 4-8" value="${this.escapeHtml(s.spec)}" />
            <button class="seq-run" data-seq="${i}" title="Run this sequence">
              <span class="seq-arrow">▶</span>
              <span class="seq-spin"></span>
            </button>
            <button class="seq-del" data-seq="${i}" title="Delete sequence">✕</button>
          </div>
        `).join('')}
        <button class="add-seq-btn" id="nba-add-seq-btn">+ Add run sequence</button>
      </div>

      <!-- Search Input -->
      <div class="search-wrap">
        <input class="search-input" id="nba-search-input" placeholder="Search by cell number or name..." value="${this.escapeHtml(this.filterText)}" />
      </div>

      <!-- Cell List Container -->
      <div class="cell-list-container" id="nba-cell-list">
        <!-- Cells rendered dynamically -->
      </div>

      <!-- Color Picker Popover (Floating) -->
      <div class="color-picker-popover" id="nba-color-picker-popover" style="display: none;">
        ${DEFAULT_COLOR_PALETTE.map(p => `
          <button class="cp-dot" data-color="${p.color}" title="${p.name}" style="color:${p.color}">●</button>
        `).join('')}
        <button class="cp-clear" id="nba-cp-clear" title="Clear color">✖</button>
      </div>
    `;

    this.attachEvents();
    this.renderCellRows(cells);
  }

  private attachEvents(): void {
    // Toolbar buttons
    const btnColor = this.container.querySelector('#nba-btn-color');
    btnColor?.addEventListener('click', () => {
      this.colorStripOpen = !this.colorStripOpen;
      this.render();
    });

    const btnGroup = this.container.querySelector('#nba-btn-group');
    btnGroup?.addEventListener('click', () => {
      this.grouped = !this.grouped;
      this.render();
    });

    const btnRuns = this.container.querySelector('#nba-btn-runs');
    btnRuns?.addEventListener('click', () => {
      this.seqPanelOpen = !this.seqPanelOpen;
      this.render();
    });

    const btnCode = this.container.querySelector('#nba-btn-code');
    btnCode?.addEventListener('click', () => {
      this.filterType = this.filterType === 'code' ? 'all' : 'code';
      this.render();
    });

    const btnMd = this.container.querySelector('#nba-btn-md');
    btnMd?.addEventListener('click', () => {
      this.filterType = this.filterType === 'markdown' ? 'all' : 'markdown';
      this.render();
    });

    // Palette strip dots
    const paletteDots = this.container.querySelectorAll<HTMLElement>('.palette-dot');
    paletteDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const color = dot.getAttribute('data-color') || '';
        this.filterColor = this.filterColor === color ? '' : color;
        this.render();
      });
    });

    const colorAll = this.container.querySelector('#nba-color-all');
    colorAll?.addEventListener('click', () => {
      this.filterColor = '';
      this.render();
    });

    // Add sequence button
    const addSeqBtn = this.container.querySelector('#nba-add-seq-btn');
    addSeqBtn?.addEventListener('click', () => {
      this.sequences.push({ name: '', spec: '', status: '' });
      this.render();
    });

    // Sequence input & run & del
    const seqNames = this.container.querySelectorAll<HTMLInputElement>('.seq-name');
    seqNames.forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.getAttribute('data-seq') || '0', 10);
        if (this.sequences[idx]) {
          this.sequences[idx].name = input.value;
        }
      });
    });

    const seqNums = this.container.querySelectorAll<HTMLInputElement>('.seq-nums');
    seqNums.forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.getAttribute('data-seq') || '0', 10);
        if (this.sequences[idx]) {
          this.sequences[idx].spec = input.value;
        }
      });
    });

    const seqRuns = this.container.querySelectorAll<HTMLButtonElement>('.seq-run');
    seqRuns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-seq') || '0', 10);
        this.runSequence(idx);
      });
    });

    const seqDels = this.container.querySelectorAll<HTMLButtonElement>('.seq-del');
    seqDels.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-seq') || '0', 10);
        this.sequences.splice(idx, 1);
        this.render();
      });
    });

    // Search input
    const searchInput = this.container.querySelector<HTMLInputElement>('#nba-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.filterText = (e.target as HTMLInputElement).value.toLowerCase();
      this.renderCellRows(this.adapter.getCells());
    });

    // Color picker popover dots
    const cpDots = this.container.querySelectorAll<HTMLElement>('.cp-dot');
    cpDots.forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = dot.getAttribute('data-color') || '';
        if (this.activeColorPickerCellIndex !== null) {
          const cells = this.adapter.getCells();
          const target = cells.find(c => c.index === this.activeColorPickerCellIndex);
          if (target) {
            const meta = this.adapter.readCellMetadata(target.element);
            this.adapter.writeCellMetadata(target.element, { ...meta, color });
          }
        }
        this.closeColorPicker();
        this.refresh();
      });
    });

    const cpClear = this.container.querySelector('#nba-cp-clear');
    cpClear?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.activeColorPickerCellIndex !== null) {
        const cells = this.adapter.getCells();
        const target = cells.find(c => c.index === this.activeColorPickerCellIndex);
        if (target) {
          const meta = this.adapter.readCellMetadata(target.element);
          this.adapter.writeCellMetadata(target.element, { ...meta, color: '' });
        }
      }
      this.closeColorPicker();
      this.refresh();
    });

    // Global click listener to close popover
    document.addEventListener('click', () => this.closeColorPicker());
  }

  private renderCellRows(cells: CellInfo[]): void {
    const listContainer = this.container.querySelector('#nba-cell-list');
    if (!listContainer) return;

    // Filter cells
    const filteredCells = cells.filter(cell => {
      if (this.filterType !== 'all' && cell.type !== this.filterType) return false;
      if (this.filterColor && cell.color !== this.filterColor) return false;
      if (this.filterText) {
        const matchesName = cell.name.toLowerCase().includes(this.filterText);
        const matchesIndex = `cell ${cell.index}`.includes(this.filterText) || `${cell.index}` === this.filterText;
        const matchesLine = cell.firstLine.toLowerCase().includes(this.filterText);
        if (!matchesName && !matchesIndex && !matchesLine) return false;
      }
      return true;
    });

    if (filteredCells.length === 0) {
      listContainer.innerHTML = `<div class="empty">No matching cells found</div>`;
      return;
    }

    if (this.grouped) {
      const sections = this.buildSections(filteredCells);
      listContainer.innerHTML = '';
      sections.forEach((sec, secIdx) => {
        const secDiv = document.createElement('div');
        secDiv.className = 'section';

        if (sec.heading !== null) {
          const isCollapsed = this.collapsedSections.has(secIdx);
          const hName = sec.heading.name ? `${sec.heading.index}: ${sec.heading.name}` : sec.heading.firstLine;

          const secHdr = document.createElement('div');
          secHdr.className = 'sec-hdr';
          secHdr.innerHTML = `
            <span class="chevron">${isCollapsed ? '▸' : '▾'}</span>
            <span class="sec-label" title="Double-click to rename">${this.escapeHtml(hName)}</span>
          `;

          secHdr.querySelector('.chevron')?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isCollapsed) {
              this.collapsedSections.delete(secIdx);
            } else {
              this.collapsedSections.add(secIdx);
            }
            this.renderCellRows(cells);
          });

          secHdr.addEventListener('click', () => {
            if (sec.heading) this.adapter.scrollToCell(sec.heading.element);
          });

          secHdr.querySelector('.sec-label')?.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (sec.heading) this.promptRename(sec.heading);
          });

          secDiv.appendChild(secHdr);

          if (!isCollapsed) {
            const secBody = document.createElement('div');
            secBody.className = 'sec-body';
            sec.children.forEach(childCell => {
              secBody.appendChild(this.createCellRowElement(childCell, true));
            });
            secDiv.appendChild(secBody);
          }
        } else {
          sec.children.forEach(childCell => {
            secDiv.appendChild(this.createCellRowElement(childCell, false));
          });
        }

        listContainer.appendChild(secDiv);
      });
    } else {
      listContainer.innerHTML = '';
      filteredCells.forEach(cell => {
        listContainer.appendChild(this.createCellRowElement(cell, false));
      });
    }
  }

  private createCellRowElement(cell: CellInfo, isChild: boolean): HTMLElement {
    const row = document.createElement('div');
    row.className = `row ${isChild ? 'child' : ''}`;
    row.setAttribute('data-index', `${cell.index}`);
    row.setAttribute('data-exec', cell.status);

    if (cell.color) {
      row.style.borderLeft = `3px solid ${cell.color}`;
    }

    const isCode = cell.type === 'code';
    const isHeadingMd = !isCode && cell.firstLine.startsWith('#');
    const displayLabel = cell.name
      ? `${cell.index}: ${cell.name}`
      : isHeadingMd
      ? cell.firstLine.replace(/^#+\s*/, '')
      : `Cell ${cell.index}`;

    const labelSpan = document.createElement('span');
    labelSpan.className = isCode ? 'label' : 'label md-label';
    labelSpan.innerText = displayLabel;
    labelSpan.title = 'Double-click to rename';

    labelSpan.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.promptRename(cell);
    });

    const execIndicator = document.createElement('span');
    execIndicator.className = isCode ? 'exec-bar' : 'exec-spacer';

    const colorBtn = document.createElement('button');
    colorBtn.className = 'color-btn';
    colorBtn.innerText = '●';
    colorBtn.title = 'Set cell color';
    if (cell.color) {
      colorBtn.style.color = cell.color;
      colorBtn.style.opacity = '1';
    }

    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openColorPicker(cell.index, colorBtn);
    });

    row.appendChild(labelSpan);
    row.appendChild(execIndicator);
    row.appendChild(colorBtn);

    row.addEventListener('click', () => {
      this.adapter.scrollToCell(cell.element);
    });

    return row;
  }

  private buildSections(cells: CellInfo[]): Section[] {
    const sections: Section[] = [];
    let current: Section = { heading: null, headingIdx: -1, children: [] };

    cells.forEach((cell) => {
      const isHeading = cell.type === 'markdown' && cell.firstLine.startsWith('#');

      if (isHeading) {
        if (current.heading !== null || current.children.length > 0) {
          sections.push(current);
        }
        current = { heading: cell, headingIdx: cell.index, children: [] };
      } else {
        current.children.push(cell);
      }
    });

    if (current.heading !== null || current.children.length > 0) {
      sections.push(current);
    }

    return sections;
  }

  private promptRename(cell: CellInfo): void {
    const newName = prompt(`Rename Cell ${cell.index}:`, cell.name);
    if (newName !== null) {
      const meta = this.adapter.readCellMetadata(cell.element);
      this.adapter.writeCellMetadata(cell.element, { ...meta, name: newName.trim() });
      this.refresh();
    }
  }

  private openColorPicker(cellIndex: number, buttonEl: HTMLElement): void {
    this.activeColorPickerCellIndex = cellIndex;
    const popover = this.container.querySelector<HTMLElement>('#nba-color-picker-popover');
    if (!popover) return;

    const rect = buttonEl.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();

    popover.style.top = `${rect.bottom - containerRect.top + 4}px`;
    popover.style.right = '10px';
    popover.style.display = 'flex';
  }

  private closeColorPicker(): void {
    this.activeColorPickerCellIndex = null;
    const popover = this.container.querySelector<HTMLElement>('#nba-color-picker-popover');
    if (popover) {
      popover.style.display = 'none';
    }
  }

  private async runSequence(seqIndex: number): Promise<void> {
    const seq = this.sequences[seqIndex];
    if (!seq || !seq.spec) return;

    const cells = this.adapter.getCells();
    const specNums = parseRunSequenceSpec(seq.spec, cells.length);

    if (specNums.length === 0) {
      alert('Invalid run sequence specification.');
      return;
    }

    seq.status = 'running';
    this.render();

    for (const num of specNums) {
      const cell = cells.find(c => c.index === num);
      if (cell) {
        this.adapter.scrollToCell(cell.element);
        const success = await this.adapter.executeCell(cell.element);
        if (!success) {
          seq.status = 'failed';
          this.render();
          return;
        }
      }
    }

    seq.status = 'success';
    this.render();
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
