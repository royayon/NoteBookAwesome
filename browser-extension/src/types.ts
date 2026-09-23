export type CellType = 'code' | 'markdown';
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'failed';

export interface CellMetadata {
  name?: string;
  color?: string;
}

export interface CellInfo {
  index: number; // 1-based index
  id: string;
  type: CellType;
  name: string;
  color: string;
  firstLine: string;
  status: ExecutionStatus;
  element: HTMLElement;
}

export interface RunSequence {
  id: string;
  name: string;
  cellsSpec: string; // e.g. "1, 2-5, 8"
}

export interface ColorOption {
  name: string;
  color: string;
}

export const DEFAULT_COLOR_PALETTE: ColorOption[] = [
  { name: 'Red', color: '#e05252' },
  { name: 'Orange', color: '#e08a3c' },
  { name: 'Yellow', color: '#d4b83c' },
  { name: 'Green', color: '#4caf6e' },
  { name: 'Blue', color: '#4a90d9' },
  { name: 'Purple', color: '#9b6dd6' }
];
