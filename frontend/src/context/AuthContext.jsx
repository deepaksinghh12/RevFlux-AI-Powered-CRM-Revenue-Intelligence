import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi } from "../lib/services";
import api, { TOKEN_KEY, ACTIVE_ORG_KEY } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  const initActiveOrg = (userData) => {
    if (!userData || !userData.workspaces || userData.workspaces.length === 0) {
      setActiveOrg(null);
      localStorage.removeItem(ACTIVE_ORG_KEY);
      return;
    }
    const savedOrgId = localStorage.getItem(ACTIVE_ORG_KEY);
    let org = userData.workspaces.find((w) => w.id === savedOrgId);
    if (!org) {
      org = userData.workspaces[0];
    }
    setActiveOrg(org);
    localStorage.setItem(ACTIVE_ORG_KEY, org.id);
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || token === "mock-token" || token === "null" || token === "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ACTIVE_ORG_KEY);
      setUser(null);
      setActiveOrg(null);
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => {
        setUser(res.user);
        initActiveOrg(res.user);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ACTIVE_ORG_KEY);
        setUser(null);
        setActiveOrg(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = (res) => {
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
    initActiveOrg(res.user);
    return res.user;
  };

  const processPendingInvite = async () => {
    const token = localStorage.getItem("PENDING_INVITE_TOKEN");
    if (token) {
      try {
        await api.post("/auth/accept-invite", { token });
      } catch (err) {
        console.error("Failed to accept pending invite:", err);
      } finally {
        localStorage.removeItem("PENDING_INVITE_TOKEN");
        // Re-fetch user to get the new workspace
        const res = await authApi.me();
        persist(res);
      }
    }
  };

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    persist(res);
    await processPendingInvite();
    return res.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    persist(res);
    await processPendingInvite();
    return res.user;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const res = await authApi.google(credential);
    persist(res);
    await processPendingInvite();
    return res.user;
  }, []);

  const otpLogin = useCallback(async (data) => {
    const res = await authApi.verifyOtp(data);
    persist(res);
    await processPendingInvite();
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACTIVE_ORG_KEY);
    setUser(null);
    setActiveOrg(null);
  }, []);

  const switchOrganization = useCallback((orgId) => {
    if (!user || !user.workspaces) return;
    const org = user.workspaces.find((w) => w.id === orgId);
    if (org) {
      setActiveOrg(org);
      localStorage.setItem(ACTIVE_ORG_KEY, org.id);
      window.location.reload(); // Hard reload to clear component states bound to old org
    }
  }, [user]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const updated = { ...prev, ...patch };
      initActiveOrg(updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, activeOrg, switchOrganization, loading, login, googleLogin, register, logout, updateUser, otpLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
