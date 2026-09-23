import { CellMetadata, RunSequence } from '../types';

export function getNotebookKey(explicitKey?: string): string {
  if (explicitKey) return explicitKey;

  // Extract file ID from Google Drive URL or document title
  const match = window.location.pathname.match(/\/drive\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `nba_drive_${match[1]}`;
  }

  const cleanTitle = document.title.replace(/\s*-\s*Colaboratory/i, '').trim();
  return `nba_title_${cleanTitle}`;
}

export async function saveCellMetadataToStorage(cellIndex: number, cellId: string, meta: CellMetadata, explicitKey?: string): Promise<void> {
  const nbKey = getNotebookKey(explicitKey);
  try {
    const syncData = (await chrome.storage.sync.get([nbKey]).catch(() => ({}))) as Record<string, any>;
    const nbData = syncData[nbKey] || { cells: {}, sequences: [] };

    nbData.cells[cellId || `cell_${cellIndex}`] = meta;
    nbData.cells[`idx_${cellIndex}`] = meta;

    await chrome.storage.sync.set({ [nbKey]: nbData }).catch(() => {
      return chrome.storage.local.set({ [nbKey]: nbData });
    });
  } catch (e) {
    console.warn('[NotebookAwesome] Storage save error:', e);
  }
}

export async function getCellMetadataFromStorage(cellIndex: number, cellId: string, explicitKey?: string): Promise<CellMetadata | null> {
  const nbKey = getNotebookKey(explicitKey);
  try {
    let data = (await chrome.storage.sync.get([nbKey]).catch(() => ({}))) as Record<string, any>;
    let nbData = data[nbKey];

    if (!nbData || !nbData.cells) {
      data = (await chrome.storage.local.get([nbKey]).catch(() => ({}))) as Record<string, any>;
      nbData = data[nbKey];
    }

    if (!nbData || !nbData.cells) return null;

    return nbData.cells[cellId] || nbData.cells[`cell_${cellIndex}`] || nbData.cells[`idx_${cellIndex}`] || null;
  } catch (e) {
    return null;
  }
}

export async function saveSequencesToStorage(sequences: RunSequence[], explicitKey?: string): Promise<void> {
  const nbKey = getNotebookKey(explicitKey);
  try {
    const data = (await chrome.storage.sync.get([nbKey]).catch(() => ({}))) as Record<string, any>;
    const nbData = data[nbKey] || { cells: {}, sequences: [] };
    nbData.sequences = sequences;

    await chrome.storage.sync.set({ [nbKey]: nbData }).catch(() => {
      return chrome.storage.local.set({ [nbKey]: nbData });
    });
  } catch (e) {
    console.warn('[NotebookAwesome] Sequences save error:', e);
  }
}

export async function getSequencesFromStorage(explicitKey?: string): Promise<RunSequence[]> {
  const nbKey = getNotebookKey(explicitKey);
  try {
    let data = (await chrome.storage.sync.get([nbKey]).catch(() => ({}))) as Record<string, any>;
    let nbData = data[nbKey];

    if (!nbData || !nbData.sequences) {
      data = (await chrome.storage.local.get([nbKey]).catch(() => ({}))) as Record<string, any>;
      nbData = data[nbKey];
    }

    return nbData?.sequences || [];
  } catch (e) {
    return [];
  }
}
