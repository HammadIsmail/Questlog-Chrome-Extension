/**
 * API sync client for communicating with the FastAPI backend daemon.
 */
import { getConfig, getPendingActivities, clearPendingActivities, savePendingActivities, BrowserActivityItem } from "./storage";

export async function syncActivitiesToBackend(): Promise<{ success: boolean; count: number; error?: string }> {
  const config = await getConfig();
  const activities = await getPendingActivities();

  if (activities.length === 0) {
    return { success: true, count: 0 };
  }

  const endpoint = `${config.backendUrl.replace(/\/$/, "")}/api/v1/activities/batch`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.authToken) {
      headers["Authorization"] = `Bearer ${config.authToken}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ activities }),
    });

    if (response.ok) {
      const count = activities.length;
      await clearPendingActivities();
      return { success: true, count };
    } else {
      const errorText = await response.text();
      return { success: false, count: 0, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || "Network request failed" };
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  const config = await getConfig();
  const endpoint = `${config.backendUrl.replace(/\/$/, "")}/api/v1/health`;
  try {
    const resp = await fetch(endpoint, { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
}
