# NotebookAwesome Browser Extension (Chrome, Edge, Firefox, Brave)

**Cell numbering, cell naming, toolbar popup navigator, and custom run order for Google Colab & Jupyter Notebooks in your browser.**

Manifest V3 compliant cross-browser extension built for **Google Chrome**, **Microsoft Edge**, **Brave**, **Opera**, and **Firefox**.

---

## 📁 Directory Structure

```
browser-extension/
├── manifest.json       # Manifest V3 extension configuration
├── popup.html          # Extension Toolbar Popup Dropdown page
├── package.json        # Build & bundling configuration
├── tsconfig.json       # TypeScript compiler settings
├── build.js            # Esbuild bundler script
├── generate_icons.js   # Generates 16px, 48px, 128px icons from root icon.svg
├── icons/              # Extension icons (16px, 48px, 128px)
├── dist/               # Bundled JS & CSS (popup.js, contentScript.js, background.js, styles.css)
└── src/
    ├── popup.ts        # Toolbar Extension Popup Dropdown UI & logic
    ├── contentScript.ts# DOM header decoration & page messaging bridge
    ├── background.ts   # Manifest V3 service worker
    ├── types.ts        # Shared TypeScript definitions
    ├── adapters/       # Platform Adapters (Google Colab, JupyterLab, Classic Jupyter)
    │   ├── baseAdapter.ts
    │   ├── colabAdapter.ts
    │   └── jupyterAdapter.ts
    ├── core/           # Metadata storage & run sequence parsing
    │   ├── metadataStore.ts
    │   └── runSequence.ts
    └── ui/             # Header banners & Styles
        ├── header.ts
        └── styles.css
```

---

## 🛠️ How to Build

1. Open terminal inside `browser-extension/`:
   ```bash
   cd browser-extension
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. Type-check TypeScript:
   ```bash
   npm run compile
   ```

---

## 🧪 How to Load & Test in Chrome / Edge / Brave

### In Google Chrome / Brave / Edge:
1. Navigate to `chrome://extensions/` (or `edge://extensions/`).
2. Enable **Developer mode** (toggle switch in the top right / left sidebar).
3. Click **Load unpacked**.
4. Select the `browser-extension` folder.
5. Open any notebook on [Google Colab](https://colab.research.google.com) or Jupyter Notebook (`localhost:8888`).
6. Click the **NotebookAwesome (🔢)** extension icon in your browser toolbar to open the Cell Navigator popup!

---

## 🚀 Store Submission Guide

The extension is **100% Manifest V3 ready** for instant submission to all major store developer portals:

### 1. 🌐 Chrome Web Store
1. Prepare the ZIP file containing: `manifest.json`, `popup.html`, `dist/`, and `icons/`.
2. Go to the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
3. Click **New Item** and upload your ZIP file.
4. Fill out store listing details, screenshots, and submit for review!

### 2. 🌊 Microsoft Edge Add-ons Store
1. Log in to the [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge).
2. Click **Create new extension** and upload the same ZIP file.
3. Microsoft Edge uses Manifest V3 directly without modification. Submit for review!

### 3. 🦊 Firefox Add-ons (AMO)
1. Go to [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Submit the extension ZIP under Manifest V3 compatibility mode (v109+).

---

## 🔒 Privacy Policy

Read the full [Privacy Policy](../PRIVACY_POLICY.md).
