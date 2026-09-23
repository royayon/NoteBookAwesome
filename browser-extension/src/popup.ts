import { CellInfo, DEFAULT_COLOR_PALETTE } from './types';
import { parseRunSequenceSpec } from './core/runSequence';

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

class PopupApp {
  private container: HTMLElement;
  private cells: CellInfo[] = [];
  private grouped = false;
  private seqPanelOpen = true;
  private colorStripOpen = false;
  private filterColor = '';
  private filterType: 'all' | 'code' | 'markdown' = 'all';
  private filterText = '';
  private activeColorPickerCellIndex: number | null = null;
  private collapsedSections = new Set<number>();
  private sequences: SeqItem[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async init(): Promise<void> {
    await this.fetchCells();

    // Fetch sequences specific to the active notebook from content script
    const seqRes = await this.sendMessageToTab({ type: 'NBA_GET_SEQUENCES' });
    if (seqRes && seqRes.sequences && seqRes.sequences.length > 0) {
      this.sequences = seqRes.sequences.map((s: any) => ({
        name: s.name,
        spec: s.cellsSpec || s.spec || '',
        status: ''
      }));
    } else {
      this.sequences = [
        { name: 'Feature Analysis', spec: '2, 3, 4, 5, 6, 7, 8, 9, 10', status: '' }
      ];
    }

    this.render();

    // Poll live execution status every 750ms while popup is open
    setInterval(async () => {
      await this.fetchCells();
      this.updateCellRowExecStatus();
    }, 750);
  }

  private updateCellRowExecStatus(): void {
    const listContainer = this.container.querySelector('#nba-cell-list');
    if (!listContainer) return;

    this.cells.forEach(cell => {
      const row = listContainer.querySelector(`.row[data-index="${cell.index}"]`);
      if (row) {
        row.setAttribute('data-exec', cell.status);
      }
    });
  }

  private async persistSequences(): Promise<void> {
    const toSave = this.sequences.map(s => ({
      id: s.name || 'seq',
      name: s.name,
      cellsSpec: s.spec
    }));
    await this.sendMessageToTab({ type: 'NBA_SAVE_SEQUENCES', sequences: toSave });
  }

  private async fetchCells(): Promise<void> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) return;

    try {
      const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'NBA_GET_CELLS' });
      if (response && response.cells) {
        this.cells = response.cells;
      }
    } catch (e) {
      console.warn('[NotebookAwesome Popup] Content script not responding on active tab:', e);
    }
  }

  private async sendMessageToTab(msg: any): Promise<any> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) return null;
    try {
      return await chrome.tabs.sendMessage(tabs[0].id, msg);
    } catch (e) {
      console.warn('[NotebookAwesome Popup] Error sending message:', e);
      return null;
    }
  }

  private render(): void {
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
        <!-- Rendered cell list -->
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
    this.renderCellRows();
  }

  private attachEvents(): void {
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

    const addSeqBtn = this.container.querySelector('#nba-add-seq-btn');
    addSeqBtn?.addEventListener('click', () => {
      this.sequences.push({ name: '', spec: '', status: '' });
      this.persistSequences();
      this.render();
    });

    const seqNames = this.container.querySelectorAll<HTMLInputElement>('.seq-name');
    seqNames.forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.getAttribute('data-seq') || '0', 10);
        if (this.sequences[idx]) {
          this.sequences[idx].name = input.value;
          this.persistSequences();
        }
      });
    });

    const seqNums = this.container.querySelectorAll<HTMLInputElement>('.seq-nums');
    seqNums.forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.getAttribute('data-seq') || '0', 10);
        if (this.sequences[idx]) {
          this.sequences[idx].spec = input.value;
          this.persistSequences();
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
        this.persistSequences();
        this.render();
      });
    });

    const searchInput = this.container.querySelector<HTMLInputElement>('#nba-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.filterText = (e.target as HTMLInputElement).value.toLowerCase();
      this.renderCellRows();
    });

    const cpDots = this.container.querySelectorAll<HTMLElement>('.cp-dot');
    cpDots.forEach(dot => {
      dot.addEventListener('click', async (e) => {
        e.stopPropagation();
        const color = dot.getAttribute('data-color') || '';
        if (this.activeColorPickerCellIndex !== null) {
          await this.sendMessageToTab({ type: 'NBA_SET_COLOR', index: this.activeColorPickerCellIndex, color });
          await this.fetchCells();
        }
        this.closeColorPicker();
        this.render();
      });
    });

    const cpClear = this.container.querySelector('#nba-cp-clear');
    cpClear?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (this.activeColorPickerCellIndex !== null) {
        await this.sendMessageToTab({ type: 'NBA_SET_COLOR', index: this.activeColorPickerCellIndex, color: '' });
        await this.fetchCells();
      }
      this.closeColorPicker();
      this.render();
    });

    document.addEventListener('click', () => this.closeColorPicker());
  }

  private renderCellRows(): void {
    const listContainer = this.container.querySelector('#nba-cell-list');
    if (!listContainer) return;

    const filteredCells = this.cells.filter(cell => {
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
      listContainer.innerHTML = `<div class="empty">${this.cells.length === 0 ? 'Open a Google Colab or Jupyter notebook tab.' : 'No matching cells found'}</div>`;
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
            this.renderCellRows();
          });

          secHdr.addEventListener('click', () => {
            if (sec.heading) this.sendMessageToTab({ type: 'NBA_SCROLL_TO_CELL', index: sec.heading.index });
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
      this.sendMessageToTab({ type: 'NBA_SCROLL_TO_CELL', index: cell.index });
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

  private async promptRename(cell: CellInfo): Promise<void> {
    const newName = prompt(`Rename Cell ${cell.index}:`, cell.name);
    if (newName !== null) {
      await this.sendMessageToTab({ type: 'NBA_SET_NAME', index: cell.index, name: newName.trim() });
      await this.fetchCells();
      this.render();
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

    const specNums = parseRunSequenceSpec(seq.spec, this.cells.length);
    if (specNums.length === 0) {
      alert('Invalid run sequence specification.');
      return;
    }

    seq.status = 'running';
    this.render();

    for (const num of specNums) {
      const res = await this.sendMessageToTab({ type: 'NBA_EXECUTE_CELL', index: num });
      if (res && res.success === false) {
        seq.status = 'failed';
        this.render();
        return;
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

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('nba-popup-root');
  if (root) {
    new PopupApp(root).init();
  }
});
