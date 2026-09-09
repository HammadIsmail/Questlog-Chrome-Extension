import { getConfig, saveConfig, getPendingActivities } from "../utils/storage";
import { checkBackendHealth } from "../utils/api";

const currentDomainEl = document.getElementById("current-domain") as HTMLElement;
const categoryBadgeEl = document.getElementById("category-badge") as HTMLElement;
const sessionTimerEl = document.getElementById("session-timer") as HTMLElement;
const queueCountEl = document.getElementById("queue-count") as HTMLElement;
const daemonStatusEl = document.getElementById("daemon-status") as HTMLElement;
const statusTextEl = document.getElementById("status-text") as HTMLElement;
const statusDotEl = document.getElementById("status-dot") as HTMLElement;
const syncMsgEl = document.getElementById("sync-msg") as HTMLElement;
const btnSync = document.getElementById("btn-sync") as HTMLButtonElement;
const btnToggle = document.getElementById("btn-toggle") as HTMLButtonElement;
const linkOptions = document.getElementById("link-options") as HTMLAnchorElement;

let timerInterval: number | null = null;
let sessionStartEpoch = 0;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

async function updateStatus() {
  const config = await getConfig();

  // Toggle button state
  if (config.isTrackingEnabled) {
    btnToggle.textContent = "Pause Tracking";
    statusTextEl.textContent = "Active";
    statusDotEl.classList.remove("paused");
  } else {
    btnToggle.textContent = "Resume Tracking";
    statusTextEl.textContent = "Paused";
    statusDotEl.classList.add("paused");
    currentDomainEl.textContent = "Tracking Paused";
    categoryBadgeEl.textContent = "Paused";
    sessionTimerEl.textContent = "--:--";
    if (timerInterval) clearInterval(timerInterval);
    return;
  }

  // Query background status
  chrome.runtime.sendMessage({ type: "GET_CURRENT_STATUS" }, (res) => {
    if (!res || !res.currentSession) {
      currentDomainEl.textContent = res?.isUserIdle ? "User Idle" : "No Active Tab";
      categoryBadgeEl.textContent = res?.isUserIdle ? "Idle" : "Idle";
      sessionTimerEl.textContent = "00:00";
      if (timerInterval) clearInterval(timerInterval);
      return;
    }

    const { domain, category, isProductive, startTime } = res.currentSession;
    currentDomainEl.textContent = domain;
    categoryBadgeEl.textContent = category;
    categoryBadgeEl.style.backgroundColor = isProductive ? "var(--accent-soft)" : "#F8D7DA";
    categoryBadgeEl.style.color = isProductive ? "var(--accent-dark)" : "var(--danger)";

    sessionStartEpoch = startTime;
    if (timerInterval) clearInterval(timerInterval);
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStartEpoch) / 1000));
      sessionTimerEl.textContent = formatDuration(elapsed);
    };
    tick();
    timerInterval = window.setInterval(tick, 1000);
  });

  // Pending queue count
  const pending = await getPendingActivities();
  queueCountEl.textContent = pending.length.toString();

  // Daemon health check
  const isHealthy = await checkBackendHealth();
  daemonStatusEl.textContent = isHealthy ? "Online" : "Offline";
  daemonStatusEl.style.color = isHealthy ? "var(--success)" : "var(--danger)";
}

// ──────── EVENT LISTENERS ────────

btnSync.addEventListener("click", async () => {
  btnSync.disabled = true;
  btnSync.textContent = "Syncing...";
  syncMsgEl.textContent = "";

  chrome.runtime.sendMessage({ type: "SYNC_NOW" }, (res) => {
    btnSync.disabled = false;
    btnSync.textContent = "Sync Now";
    if (res && res.success) {
      syncMsgEl.textContent = `Synced ${res.count} events!`;
      queueCountEl.textContent = "0";
    } else {
      syncMsgEl.textContent = res?.error || "Sync failed";
      syncMsgEl.style.color = "var(--danger)";
    }
    setTimeout(() => {
      syncMsgEl.textContent = "";
    }, 4000);
  });
});

btnToggle.addEventListener("click", async () => {
  const config = await getConfig();
  const nextState = !config.isTrackingEnabled;
  await saveConfig({ isTrackingEnabled: nextState });
  updateStatus();
});

linkOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Initial load
updateStatus();
