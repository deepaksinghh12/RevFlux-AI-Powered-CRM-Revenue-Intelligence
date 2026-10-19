import axios from "axios";

/* localStorage key for the auth token — used by AuthContext and the API client. */
export const TOKEN_KEY = "ttp_crm_token";
export const ACTIVE_ORG_KEY = "revflux_active_org";

const rawBaseURL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const cleanBase = rawBaseURL.replace(/\/+$/, "");
const baseURL = cleanBase.endsWith("/api") ? cleanBase : `${cleanBase}/api`;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT Bearer token to every outgoing request.
// Axios v1+ uses AxiosHeaders — always use .set() to avoid spread issues.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const orgId = localStorage.getItem(ACTIVE_ORG_KEY);
    const isValid =
      token &&
      token !== "null" &&
      token !== "undefined" &&
      token !== "mock-token";

    if (isValid) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    if (orgId && orgId !== "null" && orgId !== "undefined") {
      config.headers.set("X-Organization-Id", orgId);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Normalise responses & errors so callers always get clean data / messages.
api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";

    // Clear a stale/invalid token on 401 but NOT when the login call itself fails.
    const url = error.config?.url ?? "";
    if (status === 401 && !url.includes("/auth/login") && !url.includes("/auth/register")) {
      localStorage.removeItem(TOKEN_KEY);
    }

    return Promise.reject({ status, message });
  }
);

export default api;
