const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
let token = sessionStorage.getItem("campusconnect-token") || "";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function setToken(value: string) {
  token = value;
  if (value) sessionStorage.setItem("campusconnect-token", value);
  else sessionStorage.removeItem("campusconnect-token");
}

export function hasSession() {
  return Boolean(token);
}

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    if (response.status === 401 && token && path !== "/auth/login") {
      setToken("");
      window.dispatchEvent(new Event("campusconnect-session-expired"));
    }
    throw new ApiError(response.status, data?.message || "The API did not return a valid response.");
  }
  return data as T;
}
