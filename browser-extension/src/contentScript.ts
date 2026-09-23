import { ColabAdapter } from './adapters/colabAdapter';
import { JupyterAdapter } from './adapters/jupyterAdapter';
import { NotebookAdapter } from './adapters/baseAdapter';
import { createCellHeaderElement } from './ui/header';
import { getCellMetadataFromStorage, getNotebookKey, getSequencesFromStorage, saveSequencesToStorage } from './core/metadataStore';

class NotebookAwesomeApp {
  public adapter: NotebookAdapter | null = null;
  private isUpdating = false;

  public async tick(): Promise<void> {
    if (!this.adapter) {
      const colab = new ColabAdapter();
      const jupyter = new JupyterAdapter();

      if (colab.isMatch()) {
        this.adapter = colab;
      } else if (jupyter.isMatch()) {
        this.adapter = jupyter;
      }
    }

    if (!this.adapter) return;

    await this.updateCellHeaders();
  }

  public async updateCellHeaders(): Promise<void> {
    if (this.isUpdating || !this.adapter) return;
    this.isUpdating = true;

    try {
      const cells = this.adapter.getCells();
      for (const cell of cells) {
        let meta = this.adapter.readCellMetadata(cell.element);

        // Restore from chrome.storage if attributes missing on fresh load
        if (!meta.name && !meta.color) {
          const stored = await getCellMetadataFromStorage(cell.index, cell.id, getNotebookKey());
          if (stored) {
            meta = stored;
            this.adapter.writeCellMetadata(cell.element, stored);
            cell.name = stored.name || '';
            cell.color = stored.color || '';
          }
        }

        const headerEl = createCellHeaderElement(
          cell,
          (newName) => {
            if (!this.adapter) return;
            const updated = { ...this.adapter.readCellMetadata(cell.element), name: newName };
            this.adapter.writeCellMetadata(cell.element, updated);
            this.updateCellHeaders();
          }
        );

        this.adapter.injectHeader(cell.element, headerEl);
      }
    } finally {
      this.isUpdating = false;
    }
  }

  public getSerializableCells() {
    if (!this.adapter) return [];
    return this.adapter.getCells().map(c => ({
      index: c.index,
      id: c.id,
      type: c.type,
      name: c.name,
      color: c.color,
      firstLine: c.firstLine,
      status: c.status
    }));
  }
}

const app = new NotebookAwesomeApp();

function runTick() {
  app.tick();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTick);
} else {
  runTick();
}

setInterval(runTick, 1500);

// Chrome Message Handler for Extension Popup Dropdown
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!app.adapter) {
    app.tick();
  }

  if (message.type === 'NBA_GET_CELLS') {
    sendResponse({ cells: app.getSerializableCells() });
    return true;
  }

  if (message.type === 'NBA_GET_SEQUENCES') {
    getSequencesFromStorage(getNotebookKey()).then(sequences => {
      sendResponse({ sequences });
    });
    return true;
  }

  if (message.type === 'NBA_SAVE_SEQUENCES') {
    saveSequencesToStorage(message.sequences, getNotebookKey()).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'NBA_SCROLL_TO_CELL') {
    if (app.adapter) {
      const cells = app.adapter.getCells();
      const target = cells.find(c => c.index === message.index);
      if (target) {
        app.adapter.scrollToCell(target.element);
      }
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'NBA_EXECUTE_CELL') {
    if (app.adapter) {
      const cells = app.adapter.getCells();
      const target = cells.find(c => c.index === message.index);
      if (target) {
        app.adapter.executeCell(target.element).then(success => {
          sendResponse({ success });
        });
        return true;
      }
    }
    sendResponse({ success: false });
    return true;
  }

  if (message.type === 'NBA_SET_NAME') {
    if (app.adapter) {
      const cells = app.adapter.getCells();
      const target = cells.find(c => c.index === message.index);
      if (target) {
        const meta = app.adapter.readCellMetadata(target.element);
        app.adapter.writeCellMetadata(target.element, { ...meta, name: message.name });
        app.updateCellHeaders();
      }
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'NBA_SET_COLOR') {
    if (app.adapter) {
      const cells = app.adapter.getCells();
      const target = cells.find(c => c.index === message.index);
      if (target) {
        const meta = app.adapter.readCellMetadata(target.element);
        app.adapter.writeCellMetadata(target.element, { ...meta, color: message.color });
        app.updateCellHeaders();
      }
    }
    sendResponse({ success: true });
    return true;
  }
});
