/**
 * Parses a cell run specification string (e.g., "1, 2-5, 8") into an array of cell numbers.
 */
export function parseRunSequenceSpec(spec: string, maxCells: number): number[] {
  const result: number[] = [];
  if (!spec || !spec.trim()) return result;

  const parts = spec.split(',').map(p => p.trim());

  for (const part of parts) {
    if (!part) continue;

    // Check for range e.g. "2-5"
    if (part.includes('-')) {
      const rangeParts = part.split('-').map(p => parseInt(p.trim(), 10));
      if (rangeParts.length === 2 && !isNaN(rangeParts[0]) && !isNaN(rangeParts[1])) {
        const start = Math.max(1, rangeParts[0]);
        const end = Math.min(maxCells, rangeParts[1]);
        if (start <= end) {
          for (let i = start; i <= end; i++) {
            if (!result.includes(i)) result.push(i);
          }
        } else {
          for (let i = start; i >= end; i--) {
            if (!result.includes(i)) result.push(i);
          }
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxCells) {
        if (!result.includes(num)) result.push(num);
      }
    }
  }

  return result;
}
