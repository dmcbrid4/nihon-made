"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const endpoint = sent ? "/auth/verify" : "/auth/code";
    const body = sent ? { email, code } : { email };
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Sign-in failed.");
      if (sent) router.replace("/"); else { setSent(true); setMessage("Check your inbox for a six-digit code."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-mark">日<span /></div><p className="auth-japanese" lang="ja">日本まで</p><p className="auth-english">Nihon Made</p><section className="auth-card panel"><div className="auth-icon">{sent ? <ShieldCheck size={23} /> : <Mail size={23} />}</div><span className="eyebrow">PRIVATE STUDY SPACE</span><h1>{sent ? "Check your email." : "Welcome back."}</h1><p>{sent ? <>We sent a code to <strong>{email}</strong>. It expires after a short while.</> : "Sign in to keep your Japanese progress with you across devices."}</p><form onSubmit={(event) => void submit(event)}><label htmlFor="email">Email address</label><input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={sent} placeholder="you@example.com" required />{sent && <><label htmlFor="code">Six-digit code</label><input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="123456" required /></>}<button className="primary-button" disabled={busy}>{busy ? "One moment…" : sent ? "Enter my study space" : "Send sign-in code"}<ArrowRight size={17} /></button></form>{message && <p className={`auth-message ${sent && !message.includes("failed") ? "success-message" : "form-error"}`} role="status">{message}</p>}{sent && <button className="text-link auth-back" onClick={() => { setSent(false); setMessage(""); setCode(""); }}>Use a different email</button>}</section><p className="auth-footer">One private workspace · No public profiles</p></main>;
}
