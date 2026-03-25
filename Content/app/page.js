"use client";

import { useState, useEffect } from "react";
import Workspace from "@/components/Workspace";
import AuthScreen from "@/components/AuthScreen";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ce_user");
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  const login = (data) => {
    setUser(data);
    try { localStorage.setItem("ce_user", JSON.stringify(data)); } catch {}
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem("ce_user"); } catch {}
  };

  if (!loaded) return null;
  if (!user) return <AuthScreen onLogin={login} />;
  return <Workspace user={user} onLogout={logout} />;
}
