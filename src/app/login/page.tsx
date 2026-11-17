"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.href = "/";
    } else {
      setErr("Wrong PIN");
      setPin("");
    }
  }

  return (
    <main className="app">
      <form className="center" onSubmit={submit}>
        <h1>Driver Earnings</h1>
        <p className="muted" style={{ margin: 0 }}>
          Enter your PIN
        </p>
        <input
          className="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {err && <div className="bad" style={{ fontWeight: 700 }}>{err}</div>}
        <button className="btn primary" disabled={busy || !pin}>
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
