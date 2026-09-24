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

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
  const config = await getConfig();
  const endpoint = `${config.backendUrl.replace(/\/$/, "")}/api/v1/auth/login`;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "Invalid credentials" }));
      return { success: false, error: err.detail || `Login failed (HTTP ${resp.status})` };
    }

    const data = await resp.json();
    return { success: true, token: data.access_token, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reach backend" };
  }
}

export async function registerUser(
  email: string,
  name: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: any; error?: string }> {
  const config = await getConfig();
  const endpoint = `${config.backendUrl.replace(/\/$/, "")}/api/v1/auth/register`;

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ detail: "Registration failed" }));
      return { success: false, error: err.detail || `Registration failed (HTTP ${resp.status})` };
    }

    const data = await resp.json();
    return { success: true, token: data.access_token, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reach backend" };
  }
}
