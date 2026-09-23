import { NotebookAdapter } from './baseAdapter';
import { CellInfo, CellMetadata, CellType, ExecutionStatus } from '../types';
import { saveCellMetadataToStorage } from '../core/metadataStore';

export class ColabAdapter implements NotebookAdapter {
  isMatch(): boolean {
    if (!window.location.hostname.includes('colab.research.google.com')) {
      return false;
    }
    return !!(
      document.querySelector('colab-notebook-view, .notebook-content, colab-cell, .cell, #notebook, colab-left-pane') ||
      window.location.pathname.includes('/drive/') ||
      window.location.pathname.includes('/github/') ||
      window.location.pathname.includes('/gist/')
    );
  }

  getPlatformName(): string {
    return 'Google Colab';
  }

  getCells(): CellInfo[] {
    const cellElements = Array.from(document.querySelectorAll<HTMLElement>('colab-cell, .cell, .colab-cell'));
    return cellElements.map((el, index) => {
      const isCode = el.classList.contains('code') || el.getAttribute('type') === 'code' || !!el.querySelector('colab-run-button, .run-button');
      const cellType: CellType = isCode ? 'code' : 'markdown';

      const id = el.id || `colab-cell-${index + 1}`;
      if (!el.id) el.id = id;

      const meta = this.readCellMetadata(el);
      const name = meta.name || '';
      const color = meta.color || '';

      const textContent = el.innerText || el.textContent || '';
      const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('Cell '));
      const firstLine = lines.length > 0 ? lines[0] : '(empty cell)';

      let status: ExecutionStatus = 'idle';
      if (isCode) {
        const runBtn = el.querySelector('colab-run-button, .run-button');
        const isRunning = (runBtn && (runBtn.hasAttribute('running') || runBtn.classList.contains('running'))) ||
          !!el.querySelector('paper-spinner, colab-spinner, .spinner, .running, svg[class*="spin"], [running]');
        const hasError = !!el.querySelector('.error, .execution-error, div[output_type="error"], .stderr, [error]');
        const hasExecuted = !!el.querySelector('.execution-count, colab-execution-indicator, .output, .output-content, colab-output-container') ||
          (runBtn && runBtn.hasAttribute('executed')) ||
          /\[\d+\]/.test(el.innerText || '');

        if (isRunning) {
          status = 'running';
        } else if (hasError) {
          status = 'failed';
        } else if (hasExecuted) {
          status = 'success';
        }
      }

      return {
        index: index + 1,
        id,
        type: cellType,
        name,
        color,
        firstLine,
        status,
        element: el
      };
    });
  }

  scrollToCell(cellElement: HTMLElement): void {
    cellElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    cellElement.focus();
  }

  async executeCell(cellElement: HTMLElement): Promise<boolean> {
    const runBtn = cellElement.querySelector<HTMLElement>('colab-run-button, .run-button, .play-button');
    if (!runBtn) return false;

    runBtn.click();

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const isRunning = cellElement.querySelector('.running, colab-spinner, .executing');
        if (!isRunning) {
          clearInterval(checkInterval);
          const isError = cellElement.querySelector('.execution-error, .error, .failed');
          resolve(!isError);
        }
      }, 300);
    });
  }

  injectHeader(cellElement: HTMLElement, headerElement: HTMLElement): void {
    const target = cellElement.shadowRoot || cellElement.querySelector('.cell-header, .main-content, .code-cell-container, .text-cell-container') || cellElement;
    
    let existingHeader = target.querySelector('.nba-cell-header');
    if (existingHeader) {
      if (existingHeader.getAttribute('data-nba-sig') === headerElement.getAttribute('data-nba-sig')) {
        return;
      }
      existingHeader.replaceWith(headerElement);
    } else {
      target.prepend(headerElement);
    }
  }

  injectLeftSidebar(sidebarElement: HTMLElement): void {
    const existing = document.getElementById('nba-sidebar-container');
    if (existing && document.body.contains(existing)) {
      return;
    }

    sidebarElement.id = 'nba-sidebar-container';
    sidebarElement.classList.add('nba-docked-sidebar');
    sidebarElement.style.width = '300px';
    sidebarElement.style.maxWidth = '300px';
    sidebarElement.style.flexShrink = '0';
    sidebarElement.style.boxSizing = 'border-box';

    const colabLeftPane = document.querySelector<HTMLElement>('colab-left-pane, #left-panel, .colab-left-pane');

    if (colabLeftPane) {
      const targetContainer = (colabLeftPane.shadowRoot && colabLeftPane.shadowRoot.querySelector<HTMLElement>('.drawer-content, .content, #left-panel-content'))
        || colabLeftPane.querySelector<HTMLElement>('.drawer-content, #left-panel-content, .content')
        || colabLeftPane;

      targetContainer.appendChild(sidebarElement);

      const tabBar = (colabLeftPane.shadowRoot && colabLeftPane.shadowRoot.querySelector<HTMLElement>('#left-panel-tab-bar, .left-pane-tabs, div[role="tablist"], .tab-bar'))
        || document.querySelector<HTMLElement>('#left-panel-tab-bar, .left-pane-tabs, div[role="tablist"]');

      if (tabBar && !document.getElementById('nba-colab-tab')) {
        const colabTab = document.createElement('div');
        colabTab.id = 'nba-colab-tab';
        colabTab.className = 'nba-colab-tab-button';
        colabTab.setAttribute('role', 'tab');
        colabTab.title = 'NotebookAwesome Cell Navigator';
        colabTab.innerHTML = `<span style="font-size: 16px;">🔢</span>`;

        tabBar.appendChild(colabTab);

        colabTab.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHidden = sidebarElement.style.display === 'none';
          sidebarElement.style.display = isHidden ? 'flex' : 'none';
          if (isHidden) {
            colabTab.classList.add('nba-active-tab');
          } else {
            colabTab.classList.remove('nba-active-tab');
          }
        });
      }
      return;
    }

    // Fallback: Floating sidebar attached to left side
    sidebarElement.classList.remove('nba-docked-sidebar');
    sidebarElement.classList.add('nba-floating-sidebar');
    document.body.appendChild(sidebarElement);
  }

  observeCellChanges(onChanged: () => void): void {
    const mainContainer = document.querySelector('colab-notebook-view, .notebook-content, #notebook-container, #main-content, body');
    if (!mainContainer) return;

    let debounceTimer: any = null;

    const observer = new MutationObserver((mutations) => {
      let shouldTrigger = false;

      for (const m of mutations) {
        const target = m.target as HTMLElement;
        if (target && target.closest && target.closest('#nba-sidebar-container, #nba-colab-tab, .nba-cell-header, .nba-navigator-panel')) {
          continue;
        }

        let isNbaNode = false;
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && (node.classList.contains('nba-cell-header') || node.id === 'nba-sidebar-container' || node.id === 'nba-colab-tab')) {
            isNbaNode = true;
          }
        });

        if (!isNbaNode && (m.addedNodes.length > 0 || m.removedNodes.length > 0)) {
          shouldTrigger = true;
          break;
        }
      }

      if (shouldTrigger) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          onChanged();
        }, 250);
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });
  }

  readCellMetadata(cellElement: HTMLElement): CellMetadata {
    let name = cellElement.getAttribute('data-nba-name') || (cellElement as any).nbaName || '';
    let color = cellElement.getAttribute('data-nba-color') || (cellElement as any).nbaColor || '';

    // Layer 1: Check Colab cell internal JSON metadata object
    try {
      const elAny = cellElement as any;
      if (elAny.metadata && elAny.metadata.notebookawesome) {
        if (!name && elAny.metadata.notebookawesome.name) name = elAny.metadata.notebookawesome.name;
        if (!color && elAny.metadata.notebookawesome.color) color = elAny.metadata.notebookawesome.color;
      }
    } catch (e) {}

    // Layer 2: Check inline comment tags in cell text (# nba:name=... color=...)
    if (!name || !color) {
      const text = cellElement.innerText || cellElement.textContent || '';
      const tagMatch = text.match(/#\s*nba:(?:name=([^#\n\r\s]+))?(?:\s*color=([^#\n\r\s]+))?/i);
      if (tagMatch) {
        if (!name && tagMatch[1]) name = tagMatch[1].replace(/_/g, ' ');
        if (!color && tagMatch[2]) color = tagMatch[2];
      }
    }

    return { name, color };
  }

  writeCellMetadata(cellElement: HTMLElement, meta: CellMetadata): void {
    if (meta.name !== undefined) {
      cellElement.setAttribute('data-nba-name', meta.name);
      (cellElement as any).nbaName = meta.name;
    }
    if (meta.color !== undefined) {
      cellElement.setAttribute('data-nba-color', meta.color);
      (cellElement as any).nbaColor = meta.color;
    }

    // Attempt writing into Colab cell JSON metadata object so Google Drive save serializes it
    try {
      const elAny = cellElement as any;
      if (elAny.metadata) {
        elAny.metadata.notebookawesome = {
          name: meta.name ?? (elAny.nbaName || ''),
          color: meta.color ?? (elAny.nbaColor || '')
        };
      }
    } catch (e) {
      // Ignore if web component property is locked
    }

    const index = Array.from(document.querySelectorAll('colab-cell, .cell')).indexOf(cellElement) + 1;
    saveCellMetadataToStorage(index, cellElement.id, meta);
  }
}
