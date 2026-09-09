# Questlog — Chrome / Edge Web Telemetry Extension

A lightweight, privacy-preserving **Manifest V3** browser extension for **Real-Life Dungeon Master** built with **TypeScript**, **Vanilla HTML/CSS**, and **Vite**.

---

## Related Repositories

| Repository | Description |
|---|---|
| 🗄️ [Questlog-Backend](https://github.com/HammadIsmail/Questlog-Backend) | FastAPI backend — AI, scoring, scheduling, and REST API |
| 🖥️ [Questlog-Desktop-App](https://github.com/HammadIsmail/Questlog-Desktop-App) | WPF Windows desktop client with Win32 telemetry |
| 🧩 **[Questlog-Chrome-Extension](https://github.com/HammadIsmail/Questlog-Chrome-Extension)** ← *you are here* | This repo — Manifest V3 browser extension |

---

## Capabilities

- **Automatic Active Domain Telemetry**: Captures active browser tab domain (`github.com`, `stackoverflow.com`, `youtube.com`) and elapsed time.
- **Privacy-First Design (PRD §5.1 & §17)**:
  - Captures **only** the hostname/domain and tab title.
  - **Never** inspects page DOM contents, passwords, keystrokes, form inputs, or sensitive query parameters.
  - Configurable domain exclusion list (e.g. banking, internal portals).
- **Intelligent Category Classifier**:
  - Automatically tags domains as Development, DSA, Study, Productivity, Communication, Entertainment, or Other.
  - Supports custom user category overrides.
- **Idle Detection**:
  - Automatically pauses tracking when the user is inactive for >60 seconds via `chrome.idle`.
- **Resilient Batch Synchronization**:
  - Buffers domain activity in `chrome.storage.local`.
  - Automatically syncs batches to the FastAPI backend daemon (`/api/v1/activities/batch`) every 30 seconds.
- **Tactical Command Center Popup**:
  - Live session timer and current domain badge.
  - Real-time backend daemon health indicator.
  - One-click "Sync Now" and "Pause Tracking" toggles.
  - Adheres strictly to the warm-neutral design palette (`#F4F1EA`, `#FBFAF7`, `#D85C32`).

---

## Tech Stack

- **Extension Standard**: Manifest V3
- **Language**: TypeScript
- **UI**: Vanilla HTML5 & CSS3 (Zero React bloat)
- **Bundler**: Vite 6
- **APIs Used**: `chrome.tabs`, `chrome.idle`, `chrome.storage`, `chrome.alarms`, `chrome.runtime`

---

## Building the Extension

### 1. Install Dependencies
```bash
npm install
```

### 2. Build for Production
```bash
npm run build
```
The compiled, ready-to-load extension will be generated in the `dist/` directory.

### 3. Development Mode (Watch)
```bash
npm run dev
```

---

## Loading in Chrome / Edge / Brave

1. Open your Chromium-based browser and navigate to:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click the **Load unpacked** button.
4. Select the `extension/dist` directory.
5. The **Questlog Web Telemetry** extension is now installed and active!
