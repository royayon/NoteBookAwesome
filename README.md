# NotebookAwesome

> Cell numbering, renameable headers, and a quick-navigation panel for Jupyter notebooks.  
> Works in **VS Code**, **Cursor**, **Windsurf**, and all VS Code-compatible editors.

---

## Features

| Feature | Description |
|---|---|
| **Cell numbers** | Every cell displays its index automatically — updates live when you add or remove cells |
| **Renameable headers** | Give any cell a memorable name; stored inside the `.ipynb` metadata so it travels with the file and shows up in git diffs |
| **Navigation panel** | A sidebar panel lists every cell with its number, name, and type badge (Code / MD) — click any row to jump there instantly |
| **Rename from anywhere** | Use the status bar button inside each cell, the cell toolbar menu, the command palette, or the nav panel |
| **Cross-fork compatible** | Built on the standard VS Code Extension API only — no Microsoft-proprietary calls |

---

## Installation

### From VS Code Marketplace
Search for **NotebookAwesome** in the Extensions panel (`Ctrl+Shift+X`) and click Install.

### From Open VSX (Cursor, Windsurf, etc.)
Search for **NotebookAwesome** in your editor's extensions panel.  
Open VSX Registry: `open-vsx.org/extension/royayon/notebookawesome`

### Manual (.vsix)
1. Download the latest `.vsix` from [Releases](https://github.com/royayon/NoteBookAwesome/releases)
2. Run: `code --install-extension notebookawesome-*.vsix`

---

## Usage

### Naming a cell
- Click the **`$(tag) Name cell`** button in the cell status bar, or
- Right-click the cell toolbar → **Rename Cell**, or
- Open the Command Palette (`Ctrl+Shift+P`) → **NotebookAwesome: Rename Cell**, or
- Click the **✏** button next to any cell in the navigation panel

### Navigating
- Open the **NotebookAwesome** panel from the Activity Bar (notebook icon on the left)
- Click any cell row to jump to it

### Clearing a name
- Command Palette → **NotebookAwesome: Clear Cell Name**

### Where names are stored
Cell names are stored in the notebook's cell metadata under the key `notebookawesome`.  
This means names are saved inside the `.ipynb` file, travel with it when shared, and are visible in version control diffs.

---

## Screenshots

> _Screenshots coming soon._

---

## Contributing

Contributions are welcome!

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Make changes and run `npm run build` to compile
4. Press `F5` in VS Code to launch the extension host and test live
5. Open a PR

---

## License

[GPL-3.0-or-later](LICENSE) © royayon
