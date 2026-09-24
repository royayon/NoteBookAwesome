# Privacy Policy for NotebookAwesome

**Effective Date:** September 24, 2026  
**Last Updated:** September 24, 2026  

NotebookAwesome ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains our practices regarding data collection, use, and disclosure when you use the **NotebookAwesome** browser extension and related tools.

---

### 1. Summary

- **NotebookAwesome does NOT collect, transmit, sell, or monetize any of your personal information, browsing history, or notebook data.**
- All processing occurs locally within your web browser.
- No analytics, tracking pixels, advertising frameworks, or remote telemetry servers are used.

---

### 2. Information We Handle

#### a. Notebook Customization Metadata
When you customize your notebooks (such as assigning custom cell names, selecting cell color tags, or configuring custom cell run sequences):
- This information is stored locally in your browser using the Chrome Storage API (`chrome.storage.local` and `chrome.storage.sync`).
- If you have Chrome Sync enabled, Google securely syncs these settings across your signed-in browsers. We do not operate or maintain any external databases or cloud servers to store this data.
- Cell metadata may optionally be written into notebook cell comments (e.g., `# nba:...`) or notebook metadata structures if supported, purely within your notebook file.

#### b. No Personal or Sensitive Data
We do not collect:
- Names, email addresses, usernames, passwords, or authentication tokens.
- Google Account credentials or Google Drive files outside of the active notebook tab you interact with.
- IP addresses, location data, or device hardware identifiers.
- Code contents or outputs produced in your notebooks.

---

### 3. Permissions Justification

NotebookAwesome requests only the minimum permissions necessary to function:

| Permission | Purpose |
| :--- | :--- |
| `storage` | Required to save your customized cell names, color tag preferences, and run sequences locally on your device or via your personal browser sync. |
| `activeTab` | Required to detect the active notebook tab when you click the extension popup icon, allowing you to view and interact with the notebook structure. |
| `Host Permissions`<br>(`https://colab.research.google.com/*`, `http://localhost/*`, `http://127.0.0.1/*`) | Required to read cell headers, inspect execution status, and send execution triggers directly within Google Colab and local Jupyter Notebook interfaces that you have opened. |

---

### 4. Data Sharing and Third Parties

- **No Third-Party Sharing:** We do not transfer, disclose, or sell any user data to third parties.
- **No Third-Party Services:** The extension does not integrate any third-party analytics services (such as Google Analytics or Mixpanel), advertising networks, or external monitoring tools.

---

### 5. Data Retention and Deletion

- All settings and metadata are retained locally on your computer for as long as you keep the extension installed.
- You can clear all stored data at any time by removing the extension from your browser, or by clearing extension storage via your browser settings (`chrome://extensions`).

---

### 6. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any revisions will be published directly in our public GitHub repository with an updated effective date.

---

### 7. Contact Us

If you have any questions, concerns, or feedback regarding this Privacy Policy or the security of NotebookAwesome, please contact us:

- **Developer:** Ayon Roy
- **Email:** [royshouhag@gmail.com](mailto:royshouhag@gmail.com)
- **GitHub Repository:** [https://github.com/royayon/NoteBookAwesome](https://github.com/royayon/NoteBookAwesome)
- **Issue Tracker:** [https://github.com/royayon/NoteBookAwesome/issues](https://github.com/royayon/NoteBookAwesome/issues)
