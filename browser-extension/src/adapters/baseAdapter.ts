import { CellInfo, CellMetadata } from '../types';

export interface NotebookAdapter {
  /** Check if the current page matches this platform */
  isMatch(): boolean;

  /** Platform name identifier */
  getPlatformName(): string;

  /** Query all notebook cell elements currently in the DOM */
  getCells(): CellInfo[];

  /** Scroll to a specific cell */
  scrollToCell(cellElement: HTMLElement): void;

  /** Execute a specific cell */
  executeCell(cellElement: HTMLElement): Promise<boolean>;

  /** Inject custom header banner above a cell element */
  injectHeader(cellElement: HTMLElement, headerElement: HTMLElement): void;

  /** Inject or return the left sidebar drawer container */
  injectLeftSidebar(sidebarElement: HTMLElement): void;

  /** Start observing DOM mutations to update cell numbers/headers dynamically */
  observeCellChanges(onChanged: () => void): void;

  /** Read metadata stored on a cell */
  readCellMetadata(cellElement: HTMLElement): CellMetadata;

  /** Write metadata to a cell */
  writeCellMetadata(cellElement: HTMLElement, meta: CellMetadata): void;
}
