"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setMessage("Those passwords don’t match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/auth/set-password/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Couldn’t set that password.");
      router.replace("/");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Couldn’t set that password.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    setBusy(true);
    try {
      await fetch("/auth/set-password/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skip: true }),
      });
    } finally {
      router.replace("/");
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-mark">
        <BrandMark />
      </div>
      <p className="auth-japanese" lang="ja">
        日本まで
      </p>
      <p className="auth-english">Nihon Made</p>
      <section className="auth-card panel">
        <div className="auth-icon">
          <KeyRound size={23} />
        </div>
        <span className="eyebrow">ACCOUNT</span>
        <h1>Set a password</h1>
        <p>
          You’re signed in. Set a password now so you can sign back in
          directly next time, without waiting on another email.
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={8}
            required
          />
          <button className="primary-button" disabled={busy}>
            {busy ? "One moment…" : "Save password"}
            <ArrowRight size={17} />
          </button>
        </form>
        {message && (
          <p className="auth-message form-error" role="status">
            {message}
          </p>
        )}
        <button
          type="button"
          className="text-link auth-back"
          onClick={() => void skip()}
          disabled={busy}
        >
          Skip for now
        </button>
      </section>
      <p className="auth-footer" lang="ja">
        ひとりの学習場所 · あなただけの記録
      </p>
    </main>
  );
}
