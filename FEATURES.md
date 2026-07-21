# NotebookAwesome — Feature List

This file tracks what's done, what's in progress, and what's planned.  
Open an issue or PR on GitHub to discuss or contribute any of these.

---

## Done (v0.1.0)

- [x] Cell number displayed on every cell (auto-updates when cells are added/removed)
- [x] Renameable cell header — stored in `.ipynb` cell metadata, travels with the file
- [x] Rename via status bar button, cell toolbar menu, command palette, or nav panel
- [x] Clear cell name command
- [x] Navigation sidebar — lists all cells with index, name, and Code/MD badge
- [x] Click-to-navigate from the sidebar panel
- [x] Rename button in the sidebar panel per cell
- [x] Refresh command for the nav panel
- [x] Cross-fork compatible (VS Code, Cursor, Windsurf)
- [x] GPL-3.0 open source license

---

## Planned

- [ ] Cell bookmarks / starred cells (quick-jump to marked cells)
- [ ] Keyboard shortcut to jump to a cell by number
- [ ] Search/filter in the navigation panel
- [ ] Collapse sections in the nav panel (group cells under a markdown heading)
- [ ] Show execution count (`[5]`) in the nav panel
- [ ] Show first-line preview in the nav panel (truncated)
- [ ] Cell color tags (group cells visually by color)
- [ ] Export cell outline to Markdown (table of contents)
- [ ] Publish to VS Code Marketplace
- [ ] Publish to Open VSX Registry (Cursor / Windsurf)
- [ ] CI/CD pipeline for automated `.vsix` releases

---

## Ideas / Community Requests

_Add your ideas here or open a GitHub issue._

---

## Won't Do

- Modifying cell execution order (out of scope — that's the kernel's job)
- Replacing the built-in Jupyter extension UI
