"use client";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (loggedIn) {
      fetch("/api/admin/knowledge", { headers: { "x-admin-password": pw } })
        .then((r) => r.json())
        .then((d) => setText(d.knowledge || ""))
        .catch(() => {});
    }
  }, [loggedIn]);

  const login = async () => {
    setErr("");
    const r = await fetch("/api/admin/knowledge", { headers: { "x-admin-password": pw } });
    if (r.ok) setLoggedIn(true);
    else setErr("Wrong password");
  };

  const save = async () => {
    setLoading(true);
    setSaved(false);
    setErr("");
    const r = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ knowledge: text }),
    });
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setErr("Failed to save");
    }
    setLoading(false);
  };

  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 380, padding: "0 24px" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "#555", textTransform: "uppercase", marginBottom: 48, textAlign: "center" }}>Xumiiro · Admin</div>
          <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} style={{ width: "100%", padding: 16, background: "#111", border: "1px solid #222", borderRadius: 4, color: "#fff", fontSize: 14, outline: "none", marginBottom: 16, boxSizing: "border-box" }} />
          <button onClick={login} style={{ width: "100%", padding: 14, background: "#fff", color: "#000", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>Enter</button>
          {err && <div style={{ marginTop: 16, color: "#ff4444", fontSize: 12, textAlign: "center" }}>{err}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "sans-serif", color: "#fff" }}>
      <div style={{ padding: "24px 32px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.3em", color: "#555", textTransform: "uppercase" }}>Xumiiro · Agent Control</span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {saved && <span style={{ fontSize: 11, color: "#00ff88", letterSpacing: "0.1em" }}>SAVED</span>}
          {err && <span style={{ fontSize: 11, color: "#ff4444" }}>{err}</span>}
          <button onClick={save} disabled={loading} style={{ padding: "10px 24px", background: loading ? "#333" : "#fff", color: loading ? "#666" : "#000", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "wait" : "pointer" }}>{loading ? "Saving..." : "Save & Update Agent"}</button>
        </div>
      </div>
      <div style={{ padding: 32 }}>
        <div style={{ marginBottom: 24, padding: 20, background: "#111", borderRadius: 6, border: "1px solid #1a1a1a" }}>
          <div style={{ fontSize: 11, color: "#888", lineHeight: 1.8 }}>Type updates in plain English. Examples: &quot;New exhibition March 2026&quot; · &quot;Price update: SIGNAL_01 is $85,000&quot; · &quot;New collab with Aman Hotels&quot;</div>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Type your updates here...\n\nExamples:\nNew exhibition opening March 2026\nRecent sale: $120K to Four Seasons\nNew collaboration with Aman Resorts"} style={{ width: "100%", minHeight: "calc(100vh - 250px)", padding: 24, background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 6, color: "#ddd", fontSize: 14, lineHeight: 1.8, fontFamily: "monospace", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}
