# NotebookAwesome

**Cell numbering, naming, navigation, and custom run order — for Jupyter notebooks.**

<p align="center">
<strong><code>🔢 Numbered headers</code></strong> &nbsp; <strong><code>🏷️ Nameable cells</code></strong> &nbsp; <strong><code>▶️ Custom run order</code></strong><br/>
<strong><code>🧭 Cell navigator</code></strong> &nbsp; <strong><code>🎨 Color tags</code></strong> &nbsp; <strong><code>📊 Execution status</code></strong>
</p>

Big notebooks turn into a scroll-hunt fast. NotebookAwesome gives every cell a **number** and an optional **name** right in its header, a **sidebar / popup navigator** to jump anywhere in one click, **color tags** to group your work, and **custom run sequences** so you can execute just the cells you want, in the order you want.

Available for **VS Code**, **Cursor**, **Windsurf**, **Google Colab**, and **Browser Jupyter Notebooks (Chrome, Edge, Firefox, Brave)**. Free and open source.

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-install-2b7cd3?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=royayon.notebookawesome)
[![Open VSX](https://img.shields.io/open-vsx/v/royayon/notebookawesome?label=Open%20VSX&color=a60ee5)](https://open-vsx.org/extension/royayon/notebookawesome)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Browser%20Extension-4285F4?logo=googlechrome)](browser-extension/)
[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE)

---

## 🌐 Browser Extension (Google Colab & Browser Jupyter)

NotebookAwesome is available as a **Manifest V3 Cross-Browser Extension** for **Google Chrome**, **Microsoft Edge**, **Brave**, **Opera**, and **Firefox**.

### 🌟 Features in Google Colab & Browser Jupyter:
- **Toolbar Popup Dropdown (🔢)**: Click the NotebookAwesome extension icon in your browser toolbar to open the Cell Navigator dropdown — zero interference with notebook web layouts!
- **Auto-Numbered In-Page Headers**: Cell number badges (`Cell 1`, `Cell 2`), custom cell names, and color tag left-borders directly in the notebook editor.
- **Custom Run Sequences**: Define pipelines like `2, 3, 4, 5, 6, 7, 8, 9, 10` and run them sequentially with live sweeping green execution bars!
- **100% Cross-PC & Cross-Browser Metadata Sync**: Cell names, color tags, and custom run sequences are stored inside the `.ipynb` file metadata AND synced across devices via browser cloud storage (`chrome.storage.sync`).

---

## ✨ Features Overview

### 🔢 Numbered headers
A header above each cell shows its number, updated automatically as you add, remove, or reorder cells. No more "wait, which cell was that?"
<p align="center">
  <img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/Cell_Numbering.png" alt="An auto-numbered cell header reading 'Cell 13'" width="440" />
</p>

### 🏷️ Nameable cells
Give any cell a real name — `9: Train Test Split`, `4: Load Data` — shown in the header and throughout the navigator. Double-click a row to rename inline. Names are saved **inside the `.ipynb`**, so they travel with your notebook.

<p align="center">
  <img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/Cell_Rename.png" alt="A renamed cell header reading '9: Train Test Split'" width="440" />
</p>

### ▶️ Custom run order
Run only the cells you want, in the order you list them. Define named sequences like `1, 2-5, 8` and run exactly those cells, **in the order you list them**, with one click. Perfect for a quick smoke test, re-running just your model pipeline, or skipping the slow setup cells.

- Ranges supported (`2-5`) and any custom order (`8, 3, 1`).
- Each sequence is **bound to its cells** (not brittle line numbers) — reorder your notebook and the sequence still runs the right cells.
- Live **progress spinner** while running; a **green box** when it succeeds, **red** if a cell fails (it stops there).
- Stored in the `.ipynb`, so your sequences travel with the file.

<p align="center">
  <img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/Runs.png" alt="Custom run sequences — named lists of cells to run in a chosen order" width="330" />
</p>

### 🧭 Cell navigator
The sidebar / popup lists every cell with its number and name. **Click any row to jump straight to it.** Search by number or name, filter to just **Code** or **Markdown**, and collapse sections under Markdown headings for a clean outline of huge notebooks.

<p align="center">
  <img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/Navigator.png" alt="NotebookAwesome Cell Navigator — grouped cells with names, numbers, color tags, and run status" width="330" />
</p>

### 🎨 Color tags
Tag cells with colors from a customizable palette, then **filter the navigator to a single color** to focus on just those cells — great for marking TODOs, review spots, or pipeline stages.

<p align="center">
  <img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/Colors.png" alt="Color-tagging cells and filtering the navigator by color" width="330" />
</p>

### 📊 Execution status
Each code cell shows a run indicator in the navigator: a left-to-right **green sweep** while running, **solid green** on success, **red** on failure — so you can watch a Run All march down your notebook.

<p align="center">
  <img src="https://raw.githubusercontent.com/royayon/NoteBookAwesome/main/images/ExecBar.png" alt="Per-cell execution status bars in the navigator — running, success, and failed" width="330" />
</p>

### 💾 Everything travels with the file
Names, colors, and run sequences are stored in the notebook's own metadata (`notebook.metadata.notebookawesome`) — no sidecar files, no cloud sync required. Copy the `.ipynb` to another machine with the extension and it's all there.

---

## 🚀 Install

### 💻 VS Code / Cursor / Windsurf
- Open Extensions (`Ctrl+Shift+X`), search **NotebookAwesome**, click **Install**.
- Or quick-open (`Ctrl+P`) and run `ext install royayon.notebookawesome`.
- Open VSX: [open-vsx.org/extension/royayon/notebookawesome](https://open-vsx.org/extension/royayon/notebookawesome)

### 🌐 Google Colab & Browser Jupyter (Chrome, Edge, Firefox, Brave)
- Load unpacked from the [`browser-extension/`](browser-extension/) folder or install from the Chrome Web Store / Edge Add-ons Store.
- See [`browser-extension/README.md`](browser-extension/README.md) for full developer & publishing details.
