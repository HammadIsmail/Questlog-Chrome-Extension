import { getConfig, saveConfig, clearPendingActivities, getPendingActivities } from "../utils/storage";
import { checkBackendHealth } from "../utils/api";

const backendUrlInput = document.getElementById("backend-url") as HTMLInputElement;
const authTokenInput = document.getElementById("auth-token") as HTMLInputElement;
const excludedDomainsInput = document.getElementById("excluded-domains") as HTMLTextAreaElement;
const btnTest = document.getElementById("btn-test") as HTMLButtonElement;
const testResult = document.getElementById("test-result") as HTMLElement;
const btnClearQueue = document.getElementById("btn-clear-queue") as HTMLButtonElement;
const queueStatus = document.getElementById("queue-status") as HTMLElement;
const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const saveMsg = document.getElementById("save-msg") as HTMLElement;

async function init() {
  const config = await getConfig();
  backendUrlInput.value = config.backendUrl;
  authTokenInput.value = config.authToken;
  excludedDomainsInput.value = config.excludedDomains.join("\n");

  const pending = await getPendingActivities();
  queueStatus.textContent = `${pending.length} items currently in buffer`;
}

btnTest.addEventListener("click", async () => {
  btnTest.disabled = true;
  testResult.textContent = "Connecting...";
  testResult.style.color = "var(--text-secondary)";

  const isHealthy = await checkBackendHealth();
  btnTest.disabled = false;
  if (isHealthy) {
    testResult.textContent = "✓ Connected to FastAPI backend successfully!";
    testResult.style.color = "var(--success)";
  } else {
    testResult.textContent = "✗ Connection failed. Is backend running at " + backendUrlInput.value + "?";
    testResult.style.color = "var(--danger)";
  }
});

btnClearQueue.addEventListener("click", async () => {
  await clearPendingActivities();
  queueStatus.textContent = "Local queue cleared (0 items)";
  queueStatus.style.color = "var(--success)";
});

btnSave.addEventListener("click", async () => {
  const rawDomains = excludedDomainsInput.value
    .split(/[\n,]+/)
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  await saveConfig({
    backendUrl: backendUrlInput.value.trim() || "http://127.0.0.1:8000",
    authToken: authTokenInput.value.trim(),
    excludedDomains: Array.from(new Set(rawDomains)),
  });

  saveMsg.textContent = "✓ Settings saved!";
  saveMsg.style.color = "var(--success)";
  setTimeout(() => {
    saveMsg.textContent = "";
  }, 3000);
});

init();
