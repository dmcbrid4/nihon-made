"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const endpoint = "/auth/code";
    const body = { email };
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Sign-in failed.");
      setSent(true); setMessage("Open the sign-in link in your email.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  const linkError = searchParams.get("error");
  return <main className="auth-page"><div className="auth-mark">日<span /></div><p className="auth-japanese" lang="ja">日本まで</p><p className="auth-english">Nihon Made</p><section className="auth-card panel"><div className="auth-icon">{sent ? <ShieldCheck size={23} /> : <Mail size={23} />}</div><span className="eyebrow">PRIVATE STUDY SPACE</span><h1>{sent ? "Check your email." : "Welcome back."}</h1><p>{sent ? <>We sent a sign-in link to <strong>{email}</strong>. It expires after a short while.</> : "Sign in to keep your Japanese progress with you across devices."}</p>{!sent && <form onSubmit={(event) => void submit(event)}><label htmlFor="email">Email address</label><input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><button className="primary-button" disabled={busy}>{busy ? "One moment…" : "Send sign-in link"}<ArrowRight size={17} /></button></form>}{(message || linkError) && <p className={`auth-message ${sent && !linkError ? "success-message" : "form-error"}`} role="status">{message || linkError}</p>}{sent && <button className="text-link auth-back" onClick={() => { setSent(false); setMessage(""); }}>Use a different email</button>}</section><p className="auth-footer">One private workspace · No public profiles</p></main>;
}
