"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<"link" | "password">("link");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const endpoint = method === "password" ? "/auth/password" : "/auth/code";
    const body = method === "password" ? { email, password } : { email };
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Sign-in failed.");
      if (method === "password") {
        router.replace("/");
        return;
      }
      setSent(true); setMessage("Open the sign-in link in your email.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  const linkError = searchParams.get("error");
  return <main className="auth-page"><div className="auth-mark">日<span /></div><p className="auth-japanese" lang="ja">日本まで</p><p className="auth-english">Nihon Made</p><section className="auth-card panel"><div className="auth-icon">{sent ? <ShieldCheck size={23} /> : method === "password" ? <KeyRound size={23} /> : <Mail size={23} />}</div><span className="eyebrow">PRIVATE STUDY SPACE</span><h1>{sent ? "Check your email." : "Welcome back."}</h1><p>{sent ? <>We sent a sign-in link to <strong>{email}</strong>. It expires after a short while.</> : method === "password" ? "Use the password for your private study space." : "Sign in to keep your Japanese progress with you across devices."}</p>{!sent && <><div className="auth-methods" role="group" aria-label="Sign-in method"><button type="button" className={method === "password" ? "active" : ""} onClick={() => { setMethod("password"); setMessage(""); }}>Password</button><button type="button" className={method === "link" ? "active" : ""} onClick={() => { setMethod("link"); setMessage(""); }}>Email link</button></div><form onSubmit={(event) => void submit(event)}><label htmlFor="email">Email address</label><input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />{method === "password" && <><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></>}<button className="primary-button" disabled={busy}>{busy ? "One moment…" : method === "password" ? "Sign in" : "Send sign-in link"}<ArrowRight size={17} /></button></form>{method === "password" && <p className="auth-password-note">Password sign-in is ready once a password has been set for this Supabase account.</p>}</>}{(message || linkError) && <p className={`auth-message ${sent && !linkError ? "success-message" : "form-error"}`} role="status">{message || linkError}</p>}{sent && <button className="text-link auth-back" onClick={() => { setSent(false); setMessage(""); }}>Use a different email</button>}</section><p className="auth-footer" lang="ja">ひとりの学習場所 · あなただけの記録</p></main>;
}
