import { NotebookAdapter } from './baseAdapter';
import { CellInfo, CellMetadata, CellType, ExecutionStatus } from '../types';

export class JupyterAdapter implements NotebookAdapter {
  isMatch(): boolean {
    const isJupyterLab = !!document.querySelector('#jp-main-content-panel, .jp-Notebook, body[data-jp-theme-name]');
    const isClassicJupyter = !!document.querySelector('#notebook, #notebook-container, .notebook_app');
    const isNotebookOpen = !!document.querySelector('.jp-Cell, .cell, .jp-Notebook');
    return (isJupyterLab || isClassicJupyter) && isNotebookOpen;
  }

  getPlatformName(): string {
    if (document.querySelector('.jp-Notebook')) return 'JupyterLab';
    return 'Jupyter Notebook';
  }

  getCells(): CellInfo[] {
    const cellElements = Array.from(document.querySelectorAll<HTMLElement>('.jp-Cell, .cell, .jp-CodeCell, .jp-MarkdownCell, .code_cell, .text_cell'));
    return cellElements.map((el, index) => {
      const isCode = el.classList.contains('jp-CodeCell') || el.classList.contains('code_cell') || !!el.querySelector('.jp-InputPrompt, .prompt_container, .input_prompt');
      const cellType: CellType = isCode ? 'code' : 'markdown';

      const id = el.id || `jupyter-cell-${index + 1}`;
      if (!el.id) el.id = id;

      const meta = this.readCellMetadata(el);
      const name = meta.name || '';
      const color = meta.color || '';

      const textContent = el.innerText || el.textContent || '';
      const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('Cell '));
      const firstLine = lines.length > 0 ? lines[0] : '(empty cell)';

      let status: ExecutionStatus = 'idle';
      if (el.querySelector('.jp-mod-in-process, .running')) {
        status = 'running';
      } else if (el.querySelector('.jp-InputArea-prompt:not(:empty)')) {
        status = 'success';
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
    cellElement.click();
    cellElement.focus();

    const runBtn = cellElement.querySelector<HTMLElement>('.jp-RunIcon, .run_cell_btn, button[title*="Run"]');
    if (runBtn) {
      runBtn.click();
    } else {
      cellElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
    }

    return true;
  }

  injectHeader(cellElement: HTMLElement, headerElement: HTMLElement): void {
    let existingHeader = cellElement.querySelector('.nba-cell-header');
    if (existingHeader) {
      if (existingHeader.getAttribute('data-nba-sig') === headerElement.getAttribute('data-nba-sig')) {
        return;
      }
      existingHeader.replaceWith(headerElement);
    } else {
      cellElement.prepend(headerElement);
    }
  }

  injectLeftSidebar(sidebarElement: HTMLElement): void {
    const jupyterLabSidebar = document.querySelector('#jp-left-stack, .jp-SideBar');
    if (jupyterLabSidebar) {
      if (!document.getElementById('nba-sidebar-container')) {
        sidebarElement.id = 'nba-sidebar-container';
        jupyterLabSidebar.appendChild(sidebarElement);
      }
      return;
    }

    // Fallback: Floating sidebar
    if (!document.getElementById('nba-sidebar-container')) {
      sidebarElement.id = 'nba-sidebar-container';
      sidebarElement.classList.add('nba-floating-sidebar');
      document.body.appendChild(sidebarElement);
    }
  }

  observeCellChanges(onChanged: () => void): void {
    const notebookContainer = document.querySelector('.jp-Notebook, #notebook-container');
    if (!notebookContainer) return;

    let debounceTimer: any = null;

    const observer = new MutationObserver((mutations) => {
      let shouldTrigger = false;

      for (const m of mutations) {
        const target = m.target as HTMLElement;
        if (target && target.closest && target.closest('#nba-sidebar-container, .nba-cell-header, .nba-navigator-panel')) {
          continue;
        }

        let isNbaNode = false;
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && (node.classList.contains('nba-cell-header') || node.id === 'nba-sidebar-container')) {
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

    observer.observe(notebookContainer, { childList: true, subtree: true });
  }

  readCellMetadata(cellElement: HTMLElement): CellMetadata {
    const name = cellElement.getAttribute('data-nba-name') || '';
    const color = cellElement.getAttribute('data-nba-color') || '';
    return { name, color };
  }

  writeCellMetadata(cellElement: HTMLElement, meta: CellMetadata): void {
    if (meta.name !== undefined) cellElement.setAttribute('data-nba-name', meta.name);
    if (meta.color !== undefined) cellElement.setAttribute('data-nba-color', meta.color);
  }
}
