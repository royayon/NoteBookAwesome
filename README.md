# NotebookAwesome

**The navigation and organization layer your Jupyter notebooks are missing.**

Give every cell a name, a color, and an instant jump target — all stored inside the `.ipynb` file so everything travels with your notebook when you share it or move it to another machine.

Works in **VS Code**, **Cursor**, **Windsurf**, and every VS Code-compatible editor.

<p align="center">
  <img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/Navigator.png" alt="NotebookAwesome Cell Navigator panel — grouped cells with names and color tags" width="320" />
</p>

---

## Features

### Cell Navigator panel
A sidebar panel that lists every cell in your notebook. Click any row to jump to it instantly. Filter by Code or Markdown, filter by color, search by name or number — the panel keeps up as you work.

### Renameable cell headers
Give any cell a memorable name. The name appears above the cell code and in the navigator. Double-click a row in the panel to rename it inline, or use the Command Palette. Cells you haven't named show their number automatically.

<img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/Cell_Rename.png" alt="A renamed cell header reading '9: Train Test Split'" width="380" />
<img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/Cell_Numbering.png" alt="A default cell header reading 'Cell 13'" width="380" />

### Cell color tags
Tag cells with colors from a customizable palette. A colored dot appears next to each cell in the navigator. Filter the panel down to a single color to focus on just those cells.

### Execution state bar
A thin bar below each code cell row in the navigator shows its execution state at a glance:

| State | Appearance |
|---|---|
| Not run | Gray bar |
| Running | Pulsing green animation |
| Success | Solid green |
| Failed | Solid red |

### Jump to cell — `Ctrl+Alt+G`
A quick-pick menu that filters all cells by number, name, or first line of code. Keyboard-navigable; press Enter to jump.

### Grouping by Markdown headings
Markdown cells act as collapsible section headers. Code cells between two headings are grouped under the first, keeping the navigator compact for large notebooks.

### Portable metadata
Names and colors are stored in `notebook.metadata.notebookawesome` inside the `.ipynb` file. They travel with the notebook when you copy it, share it, or open it on a different machine — no extra files required.

---

## Installation

### VS Code Marketplace
Search **NotebookAwesome** in the Extensions panel (`Ctrl+Shift+X`) and click Install.

### Open VSX (Cursor, Windsurf, and other forks)
Search **NotebookAwesome** in your editor's Extensions panel, or visit [open-vsx.org](https://open-vsx.org/extension/royayon/notebookawesome).

### Manual install
1. Download the latest `.vsix` from [Releases](https://github.com/royayon/NoteBookAwesome/releases)
2. `code --install-extension notebookawesome-*.vsix`

---

## Usage

### Rename a cell
- **Double-click** any row label in the Cell Navigator panel, or
- `Ctrl+Shift+P` → **NotebookAwesome: Rename Cell**

### Set a cell color
- Click the **●** dot on the right side of any row in the navigator
- Pick a color from the popup; click the dot again to clear it

### Navigate
- Open the **Cell Navigator** from the Activity Bar (notebook icon)
- Click any row to jump to that cell

### Filter and search
- Type in the search box to filter by cell number or name
- Click **Code** or **MD** to show only that type
- Click the **Color** button to open the palette strip and filter by color

### Jump anywhere — `Ctrl+Alt+G`
Opens a quick-pick with all cells. Type a number, name, or first line of code to narrow down, then press Enter.

---

## How metadata is stored

Names and colors live at `notebook.metadata.notebookawesome.cells` in the `.ipynb` JSON — the same file you already version-control and share. No sidecar files, no cloud sync, no editor-specific storage.

```json
"metadata": {
  "kernelspec": { "..." },
  "notebookawesome": {
    "cells": {
      "<content-hash>": { "name": "Feature Engineering", "color": "#4caf6e" }
    }
  }
}
```

Keys are SHA-1 hashes of each cell's content, so renaming or reordering cells doesn't lose their metadata.

---

## Configuration

Add to your `settings.json` to customize the color palette:

```json
"notebookawesome.colorPalette": [
  { "name": "Red",    "color": "#e05252" },
  { "name": "Green",  "color": "#4caf6e" },
  { "name": "Blue",   "color": "#4a90d9" },
  { "name": "Yellow", "color": "#d4b83c" }
]
```

---

## Contributing

1. Fork the repo and create a branch
2. `npm install` then `npm run watch` to compile on change
3. Press `F5` in VS Code to launch the Extension Development Host
4. Open any `.ipynb` file and test your changes
5. Open a PR — contributions welcome

---

## License

[GPL-3.0-or-later](LICENSE) © royayon
