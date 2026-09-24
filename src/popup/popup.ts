import { getConfig, saveConfig, getPendingActivities } from "../utils/storage";
import { checkBackendHealth, loginUser, registerUser } from "../utils/api";
import { extractDomain, classifyDomain } from "../utils/classifier";

// ──────── DOM ELEMENTS ────────
// Panels
const authView = document.getElementById("auth-view") as HTMLElement;
const trackingView = document.getElementById("tracking-view") as HTMLElement;

// Auth Elements
const tabSignIn = document.getElementById("tab-signin") as HTMLButtonElement;
const tabSignUp = document.getElementById("tab-signup") as HTMLButtonElement;
const groupName = document.getElementById("group-name") as HTMLElement;
const authTitle = document.getElementById("auth-title") as HTMLElement;
const authDesc = document.getElementById("auth-desc") as HTMLElement;
const authAlert = document.getElementById("auth-alert") as HTMLElement;
const authForm = document.getElementById("auth-form") as HTMLFormElement;
const inputName = document.getElementById("input-name") as HTMLInputElement;
const inputEmail = document.getElementById("input-email") as HTMLInputElement;
const inputPassword = document.getElementById("input-password") as HTMLInputElement;
const btnAuthSubmit = document.getElementById("btn-auth-submit") as HTMLButtonElement;
const btnQuickGuest = document.getElementById("btn-quick-guest") as HTMLButtonElement;
const linkOptionsAuth = document.getElementById("link-options-auth") as HTMLAnchorElement;

// Tracking Elements
const userDisplayEl = document.getElementById("user-display") as HTMLElement;
const btnLogout = document.getElementById("btn-logout") as HTMLButtonElement;
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
const linkOptionsTrack = document.getElementById("link-options-track") as HTMLAnchorElement;

let isSignUpMode = false;
let timerInterval: number | null = null;
let sessionStartEpoch = 0;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function showAuthAlert(message: string, isError = true) {
  authAlert.textContent = message;
  authAlert.className = isError ? "alert-box alert-error" : "alert-box alert-success";
  authAlert.style.display = "block";
}

function clearAuthAlert() {
  authAlert.textContent = "";
  authAlert.style.display = "none";
}

// ──────── AUTHENTICATION LOGIC ────────

function setAuthMode(signUp: boolean) {
  isSignUpMode = signUp;
  clearAuthAlert();

  if (isSignUpMode) {
    tabSignIn.classList.remove("active");
    tabSignUp.classList.add("active");
    groupName.style.display = "flex";
    authTitle.textContent = "Create Adventurer Profile";
    authDesc.textContent = "Register an account to sync web telemetry with your quest log";
    btnAuthSubmit.textContent = "Create Adventurer Account";
  } else {
    tabSignIn.classList.add("active");
    tabSignUp.classList.remove("active");
    groupName.style.display = "none";
    authTitle.textContent = "Realm Authentication";
    authDesc.textContent = "Sign in to sync your web telemetry with your quest log";
    btnAuthSubmit.textContent = "Enter the Realm (Sign In)";
  }
}

async function handleAuthSuccess(token: string, user?: { email?: string; name?: string }) {
  const email = user?.email || inputEmail.value.trim();
  const name = user?.name || inputName.value.trim() || "Adventurer";

  await saveConfig({
    authToken: token,
    userEmail: email,
    userName: name,
  });

  clearAuthAlert();
  initView();
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAuthAlert();

  const email = inputEmail.value.trim();
  const password = inputPassword.value;
  const name = inputName.value.trim();

  if (!email || !password) {
    showAuthAlert("Please enter both email and password.");
    return;
  }

  if (isSignUpMode && !name) {
    showAuthAlert("Please enter your adventurer name.");
    return;
  }

  btnAuthSubmit.disabled = true;
  btnAuthSubmit.textContent = isSignUpMode ? "Creating Account..." : "Signing In...";

  try {
    if (isSignUpMode) {
      const res = await registerUser(email, name, password);
      if (res.success && res.token) {
        await handleAuthSuccess(res.token, res.user);
      } else {
        showAuthAlert(res.error || "Registration failed.");
      }
    } else {
      const res = await loginUser(email, password);
      if (res.success && res.token) {
        await handleAuthSuccess(res.token, res.user);
      } else {
        showAuthAlert(res.error || "Invalid credentials.");
      }
    }
  } catch (err: any) {
    showAuthAlert(err.message || "Authentication error.");
  } finally {
    btnAuthSubmit.disabled = false;
    btnAuthSubmit.textContent = isSignUpMode ? "Create Adventurer Account" : "Enter the Realm (Sign In)";
  }
});

btnQuickGuest.addEventListener("click", async () => {
  clearAuthAlert();
  btnQuickGuest.disabled = true;
  btnQuickGuest.textContent = "Entering as Guest...";

  const defaultEmail = "adventurer@questlog.com";
  const defaultPass = "AdventurerPass123!";
  const defaultName = "Adventurer";

  try {
    let res = await loginUser(defaultEmail, defaultPass);
    if (!res.success) {
      res = await registerUser(defaultEmail, defaultName, defaultPass);
    }

    if (res.success && res.token) {
      await handleAuthSuccess(res.token, { email: defaultEmail, name: defaultName });
    } else {
      showAuthAlert(res.error || "Could not connect to backend server.");
    }
  } catch (err: any) {
    showAuthAlert(err.message || "Failed to reach backend.");
  } finally {
    btnQuickGuest.disabled = false;
    btnQuickGuest.textContent = "⚡ Quick Demo (Guest Adventurer)";
  }
});

tabSignIn.addEventListener("click", () => setAuthMode(false));
tabSignUp.addEventListener("click", () => setAuthMode(true));

btnLogout.addEventListener("click", async () => {
  if (timerInterval) clearInterval(timerInterval);
  await saveConfig({ authToken: "", userEmail: "", userName: "" });
  initView();
});

// ──────── TRACKING & DOMAIN STATUS ────────

async function updateTrackingStatus() {
  const config = await getConfig();

  // Set user profile
  userDisplayEl.textContent = config.userName || config.userEmail || "Adventurer";

  // Toggle button state
  if (config.isTrackingEnabled) {
    btnToggle.textContent = "Pause Tracking";
    statusTextEl.textContent = "Active Monitoring";
    statusDotEl.classList.remove("paused");
  } else {
    btnToggle.textContent = "Resume Tracking";
    statusTextEl.textContent = "Tracking Paused";
    statusDotEl.classList.add("paused");
    currentDomainEl.textContent = "Tracking Paused";
    categoryBadgeEl.textContent = "Paused";
    sessionTimerEl.textContent = "--:--";
    if (timerInterval) clearInterval(timerInterval);
    return;
  }

  // 1. Query background service worker
  chrome.runtime.sendMessage({ type: "GET_CURRENT_STATUS" }, async (res) => {
    let session = res?.currentSession;

    // 2. Direct Fallback if service worker returned null
    if (!session) {
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0 && tabs[0].url) {
          const domain = extractDomain(tabs[0].url);
          if (domain && !config.excludedDomains.includes(domain)) {
            const classification = classifyDomain(domain, config.userOverrides);
            session = {
              domain,
              title: tabs[0].title || domain,
              category: classification.category,
              isProductive: classification.isProductive,
              startTime: Date.now(),
            };
            if (tabs[0].id) {
              chrome.runtime.sendMessage({ type: "SET_ACTIVE_TAB", tabId: tabs[0].id });
            }
          }
        }
      } catch {
        // Fallback failed
      }
    }

    if (!session) {
      currentDomainEl.textContent = res?.isUserIdle ? "User Idle" : "No Active Tab";
      categoryBadgeEl.textContent = "Idle";
      categoryBadgeEl.style.backgroundColor = "var(--surface-muted)";
      categoryBadgeEl.style.color = "var(--text-secondary)";
      sessionTimerEl.textContent = "00:00";
      if (timerInterval) clearInterval(timerInterval);
      return;
    }

    const { domain, category, isProductive, startTime } = session;
    currentDomainEl.textContent = domain;
    categoryBadgeEl.textContent = category;
    categoryBadgeEl.style.backgroundColor = isProductive ? "var(--accent-soft)" : "#F8D7DA";
    categoryBadgeEl.style.color = isProductive ? "var(--accent-dark)" : "var(--danger)";

    sessionStartEpoch = startTime || Date.now();
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

// ──────── ACTIONS & EVENT LISTENERS ────────

btnSync.addEventListener("click", async () => {
  btnSync.disabled = true;
  btnSync.textContent = "Syncing...";
  syncMsgEl.textContent = "";

  chrome.runtime.sendMessage({ type: "SYNC_NOW" }, (res) => {
    btnSync.disabled = false;
    btnSync.textContent = "Sync Now";
    if (res && res.success) {
      syncMsgEl.textContent = `✓ Synced ${res.count} items!`;
      syncMsgEl.style.color = "var(--success)";
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
  updateTrackingStatus();
});

const openOptions = (e: MouseEvent) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
};

linkOptionsAuth.addEventListener("click", openOptions);
linkOptionsTrack.addEventListener("click", openOptions);

// ──────── INITIALIZATION ────────

async function initView() {
  const config = await getConfig();

  if (!config.authToken) {
    // Show Auth View
    authView.style.display = "block";
    trackingView.style.display = "none";
    setAuthMode(false);
  } else {
    // Show Tracking View
    authView.style.display = "none";
    trackingView.style.display = "block";
    updateTrackingStatus();
  }
}

initView();
