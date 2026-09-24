/**
 * Local storage wrapper using chrome.storage.local
 */

export interface BrowserActivityItem {
  app_name: string;
  window_title: string;
  category: string;
  start_time: string; // ISO format
  end_time: string;   // ISO format
  duration_seconds: number;
  is_productive: boolean;
}

export interface ExtensionConfig {
  backendUrl: string;
  authToken: string;
  userEmail?: string;
  userName?: string;
  isTrackingEnabled: boolean;
  excludedDomains: string[];
  userOverrides: Record<string, { category: string; isProductive: boolean }>;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  backendUrl: "https://questlog-backend-pi.vercel.app",
  authToken: "",
  userEmail: "",
  userName: "",
  isTrackingEnabled: true,
  excludedDomains: ["localhost", "127.0.0.1"],
  userOverrides: {},
};

export async function getConfig(): Promise<ExtensionConfig> {
  const data = await chrome.storage.local.get("config");
  return { ...DEFAULT_CONFIG, ...(data.config || {}) };
}

export async function saveConfig(config: Partial<ExtensionConfig>): Promise<void> {
  const current = await getConfig();
  await chrome.storage.local.set({ config: { ...current, ...config } });
}

export async function getPendingActivities(): Promise<BrowserActivityItem[]> {
  const data = await chrome.storage.local.get("pendingActivities");
  return data.pendingActivities || [];
}

export async function savePendingActivities(activities: BrowserActivityItem[]): Promise<void> {
  await chrome.storage.local.set({ pendingActivities: activities });
}

export async function enqueueActivity(activity: BrowserActivityItem): Promise<void> {
  const list = await getPendingActivities();
  list.push(activity);
  // Cap local buffer at 200 items to prevent memory unbounded growth
  if (list.length > 200) {
    list.splice(0, list.length - 200);
  }
  await savePendingActivities(list);
}

export async function clearPendingActivities(): Promise<void> {
  await chrome.storage.local.set({ pendingActivities: [] });
}
