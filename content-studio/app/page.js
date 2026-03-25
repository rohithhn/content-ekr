"use client";

import { useState, useEffect } from "react";
import AuthScreen from "@/components/AuthScreen";

function normalizeStoredUser(raw) {
  if (!raw || typeof raw !== "object") return null;
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  if (!email) return null;
  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : email.split("@")[0] || "User";
  return { email, name };
}

const shellStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#0C0D14",
  color: "#8B8DA3",
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: 14,
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  /** Lazy-loaded so the first paint does not parse Workspace + Dexie + icons on the main thread. */
  const [WorkspaceComponent, setWorkspaceComponent] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ce_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        const normalized = normalizeStoredUser(parsed);
        if (normalized) setUser(normalized);
        else localStorage.removeItem("ce_user");
      }
    } catch {
      try {
        localStorage.removeItem("ce_user");
      } catch {}
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setWorkspaceComponent(null);
      return;
    }
    let cancelled = false;
    import("@/components/Workspace").then((m) => {
      if (!cancelled) setWorkspaceComponent(() => m.default);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const login = (data) => {
    const normalized = normalizeStoredUser(data);
    if (!normalized) return;
    setUser(normalized);
    try {
      localStorage.setItem("ce_user", JSON.stringify(normalized));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("ce_user");
    } catch {}
  };

  if (!loaded) {
    return (
      <div style={shellStyle}>
        Loading ContentEngine…
      </div>
    );
  }
  if (!user) return <AuthScreen onLogin={login} />;
  if (!WorkspaceComponent) {
    return (
      <div style={shellStyle}>
        Loading studio…
      </div>
    );
  }
  return <WorkspaceComponent user={user} onLogout={logout} />;
}
