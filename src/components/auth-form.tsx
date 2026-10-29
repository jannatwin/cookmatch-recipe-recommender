"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/client-api";
import { buttonPrimary, inputClass } from "@/components/ui";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const registering = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (registering) {
        const result = await apiRequest<{ confirmationRequired: boolean }>("/api/v1/auth/register", {
          method: "POST", body: JSON.stringify({ name, email, password }),
        });
        if (result.confirmationRequired) {
          setNotice("Your account is ready. Check your email to confirm it, then sign in.");
          return;
        }
      } else {
        await apiRequest<{ user: { role: string } }>("/api/v1/auth/login", {
          method: "POST", body: JSON.stringify({ email, password }),
        });
      }
      const search = new URLSearchParams(window.location.search);
      const next = search.get("next");
      let destination = "/pantry";
      if (next?.startsWith("/")) {
        try {
          const target = new URL(next, window.location.origin);
          if (target.origin === window.location.origin) destination = `${target.pathname}${target.search}${target.hash}`;
        } catch { /* Fall back to the pantry for malformed return paths. */ }
      }
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not complete that request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[14px_14px_36px_rgb(120_70_50_/_14%),inset_3px_3px_8px_rgb(255_255_255_/_80%)] sm:p-9">
      <div className="mb-7">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#8b604d]">{registering ? "A fresh start" : "Welcome back"}</p>
        <h1 className="text-3xl font-black tracking-tight">{registering ? "Create your account" : "Sign in to CookMatch"}</h1>
        <p className="mt-2 leading-6 text-[#765b4d]">{registering ? "Save your pantry and find your next favorite meal." : "Your pantry and recipes are waiting for you."}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {registering && <div>
          <label htmlFor="name" className="mb-2 block text-sm font-extrabold">Your name</label>
          <input id="name" name="name" autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="e.g. Jannat" />
        </div>}
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-extrabold">Email address</label>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-extrabold">Password</label>
          <input id="password" name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength={registering ? 8 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} placeholder={registering ? "At least 8 characters" : "Your password"} />
        </div>
        {error && <p role="alert" className="rounded-2xl bg-[#ffe1dd] px-4 py-3 text-sm font-semibold text-[#7b2b22]">{error}</p>}
        {notice && <p role="status" className="rounded-2xl bg-mint px-4 py-3 text-sm font-semibold">{notice}</p>}
        <button type="submit" disabled={busy} className={`${buttonPrimary} w-full`}>
          {busy ? "One moment…" : registering ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#765b4d]">
        {registering ? "Already have an account? " : "New to CookMatch? "}
        <Link href={registering ? "/login" : "/register"} className="font-extrabold text-cocoa underline decoration-coral decoration-2 underline-offset-4">
          {registering ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
