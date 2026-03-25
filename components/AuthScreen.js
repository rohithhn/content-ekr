"use client";
import { useState } from "react";

const field = { padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#E2E4EA", fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };

export default function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (!email || !password) return setError("All fields required");
    if (!isLogin && !name) return setError("Name required");
    if (!email.includes("@")) return setError("Invalid email");
    if (password.length < 6) return setError("Password 6+ chars");
    onLogin({ email, name: name || email.split("@")[0] });
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#08090E", fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 600, height: 600, background: "radial-gradient(circle,rgba(108,43,217,0.15) 0%,transparent 70%)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: 500, height: 500, background: "radial-gradient(circle,rgba(20,184,166,0.12) 0%,transparent 70%)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ width: 420, padding: 48, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(40px)", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "white" }}>C</div>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#F1F1F4", letterSpacing: "-0.5px" }}>ContentEngine</span>
          </div>
          <p style={{ color: "#6B7084", fontSize: 14, margin: "8px 0 0" }}>AI-powered content studio for every channel</p>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3, marginBottom: 28, border: "1px solid rgba(255,255,255,0.06)" }}>
          {["Sign In", "Create Account"].map((l, i) => (
            <button key={l} onClick={() => { setIsLogin(i === 0); setError(""); }} style={{ flex: 1, padding: 10, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: (i === 0 ? isLogin : !isLogin) ? "rgba(108,43,217,0.25)" : "transparent", color: (i === 0 ? isLogin : !isLogin) ? "#C4B5FD" : "#6B7084" }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!isLogin && <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={field} />}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={field} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={field} onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        {error && <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#FCA5A5", fontSize: 13 }}>{error}</div>}
        <button onClick={submit} style={{ width: "100%", marginTop: 22, padding: 14, border: "none", borderRadius: 10, background: "linear-gradient(135deg,#6C2BD9,#5B21B6)", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 20px rgba(108,43,217,0.3)" }}>{isLogin ? "Sign In" : "Create Account"}</button>
      </div>
    </div>
  );
}
