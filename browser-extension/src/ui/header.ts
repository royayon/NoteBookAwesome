import { CellInfo } from '../types';

export function createCellHeaderElement(
  cell: CellInfo,
  onRename: (newName: string) => void
): HTMLElement {
  const header = document.createElement('div');
  header.className = `nba-cell-header ${cell.color ? 'nba-has-color' : ''}`;
  header.setAttribute('data-nba-sig', `${cell.index}-${cell.name}-${cell.color}-${cell.type}`);
  if (cell.color) {
    header.style.borderLeft = `4px solid ${cell.color}`;
  }

  // Cell Number Badge
  const numberSpan = document.createElement('span');
  numberSpan.className = 'nba-cell-number';
  numberSpan.innerText = `Cell ${cell.index}`;

  // Cell Name Container (with edit icon)
  const nameContainer = document.createElement('span');
  nameContainer.className = 'nba-cell-name-container';

  const nameText = document.createElement('span');
  nameText.className = 'nba-cell-name';
  nameText.innerText = cell.name ? `: ${cell.name}` : '';
  nameText.title = 'Click to rename cell';

  const editIcon = document.createElement('span');
  editIcon.className = 'nba-edit-icon';
  editIcon.innerText = ' ✏️';
  editIcon.title = 'Rename cell';

  const triggerRename = (e: Event) => {
    e.stopPropagation();
    const currentName = cell.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'nba-rename-input';
    input.value = currentName;
    input.placeholder = 'Type cell name...';

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      onRename(input.value.trim());
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') {
        commit();
      } else if (evt.key === 'Escape') {
        committed = true;
        input.replaceWith(nameContainer);
      }
    });

    nameContainer.replaceWith(input);
    input.focus();
    input.select();
  };

  nameText.addEventListener('click', triggerRename);
  editIcon.addEventListener('click', triggerRename);

  nameContainer.appendChild(nameText);
  nameContainer.appendChild(editIcon);

  // Type Indicator Badge
  const typeSpan = document.createElement('span');
  typeSpan.className = `nba-cell-type nba-type-${cell.type}`;
  typeSpan.innerText = cell.type === 'code' ? '[Code]' : '[Markdown]';

  header.appendChild(numberSpan);
  header.appendChild(nameContainer);
  header.appendChild(typeSpan);

  return header;
}
