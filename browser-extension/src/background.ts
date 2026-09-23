// Background Service Worker for Manifest V3 extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('[NotebookAwesome] Browser Extension installed successfully.');
});
