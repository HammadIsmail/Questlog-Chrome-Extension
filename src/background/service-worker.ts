/**
 * Service Worker (Background) for Questlog Chrome Extension Manifest V3.
 * Manages active tab monitoring, idle detection, session timing, and batch sync.
 */

import { extractDomain, classifyDomain } from "../utils/classifier";
import { getConfig, enqueueActivity, BrowserActivityItem } from "../utils/storage";
import { syncActivitiesToBackend } from "../utils/api";

interface ActiveSession {
  domain: string;
  title: string;
  category: string;
  isProductive: boolean;
  startTime: number; // Unix epoch ms
}

let currentSession: ActiveSession | null = null;
let isUserIdle = false;

// ──────── SESSION MANAGEMENT ────────

async function endCurrentSession() {
  if (!currentSession) return;

  const now = Date.now();
  const durationSeconds = Math.round((now - currentSession.startTime) / 1000);

  // Discard flashes under 2 seconds
  if (durationSeconds >= 2) {
    const activity: BrowserActivityItem = {
      app_name: "Google Chrome",
      window_title: `${currentSession.domain} — ${currentSession.title}`,
      category: currentSession.category,
      start_time: new Date(currentSession.startTime).toISOString(),
      end_time: new Date(now).toISOString(),
      duration_seconds: durationSeconds,
      is_productive: currentSession.isProductive,
    };

    await enqueueActivity(activity);
  }

  currentSession = null;
}

/**
 * Periodically captures elapsed time for continuous sessions so
 * activity isn't lost if the user stays on one tab for hours.
 */
async function snapshotActiveSession() {
  if (!currentSession) return;

  const now = Date.now();
  const durationSeconds = Math.round((now - currentSession.startTime) / 1000);

  if (durationSeconds >= 30) {
    const activity: BrowserActivityItem = {
      app_name: "Google Chrome",
      window_title: `${currentSession.domain} — ${currentSession.title}`,
      category: currentSession.category,
      start_time: new Date(currentSession.startTime).toISOString(),
      end_time: new Date(now).toISOString(),
      duration_seconds: durationSeconds,
      is_productive: currentSession.isProductive,
    };

    await enqueueActivity(activity);
    currentSession.startTime = now; // reset slice start time
  }
}

async function handleTabChange(tabId: number) {
  const config = await getConfig();
  if (!config.isTrackingEnabled || isUserIdle) {
    await endCurrentSession();
    return;
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
      await endCurrentSession();
      return;
    }

    const domain = extractDomain(tab.url);
    if (!domain) {
      await endCurrentSession();
      return;
    }

    // Check domain exclusions
    if (config.excludedDomains.some((ex) => domain === ex || domain.endsWith("." + ex))) {
      await endCurrentSession();
      return;
    }

    // If same domain, just update title and continue session
    if (currentSession && currentSession.domain === domain) {
      currentSession.title = tab.title || domain;
      return;
    }

    // End previous session
    await endCurrentSession();

    // Start new session
    const classification = classifyDomain(domain, config.userOverrides);
    currentSession = {
      domain,
      title: tab.title || domain,
      category: classification.category,
      isProductive: classification.isProductive,
      startTime: Date.now(),
    };
  } catch {
    await endCurrentSession();
  }
}

async function getOrInitActiveTabSession(): Promise<ActiveSession | null> {
  const config = await getConfig();
  if (!config.isTrackingEnabled || isUserIdle) {
    return null;
  }

  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs.length > 0 && tabs[0].id && tabs[0].url) {
      const domain = extractDomain(tabs[0].url);
      if (domain) {
        if (!currentSession || currentSession.domain !== domain) {
          await handleTabChange(tabs[0].id);
        }
      }
    }
  } catch {
    // Keep currentSession
  }

  return currentSession;
}

// ──────── CHROME EVENT LISTENERS ────────

// Tab activated (switched tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  handleTabChange(activeInfo.tabId);
});

// Tab updated (navigated to new URL)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    handleTabChange(tabId);
  }
});

// Window focus changed
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await endCurrentSession();
  } else {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id) {
      handleTabChange(tabs[0].id);
    }
  }
});

// Idle detection (idle after 60 seconds)
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "idle" || state === "locked") {
    isUserIdle = true;
    await endCurrentSession();
  } else if (state === "active") {
    isUserIdle = false;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id) {
      handleTabChange(tabs[0].id);
    }
  }
});

// Periodic alarm for batch syncing (every 30 seconds)
chrome.alarms.create("sync_activities", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "sync_activities") {
    await snapshotActiveSession();
    await syncActivitiesToBackend();
  }
});

// Initial tab detection on startup/wake-up
getOrInitActiveTabSession();

// Message listener for popup communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_CURRENT_STATUS") {
    getOrInitActiveTabSession().then((session) => {
      sendResponse({
        currentSession: session,
        isUserIdle,
      });
    });
    return true; // async response
  }

  if (message.type === "SET_ACTIVE_TAB") {
    if (message.tabId) {
      handleTabChange(message.tabId).then(() => {
        sendResponse({ currentSession });
      });
      return true;
    }
  }

  if (message.type === "SYNC_NOW") {
    (async () => {
      await snapshotActiveSession();
      const result = await syncActivitiesToBackend();
      sendResponse(result);
    })();
    return true; // async response
  }

  return false;
});
