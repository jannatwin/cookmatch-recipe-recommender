"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/client-api";

type CurrentUser = { userId: string; name: string; email: string; role: "user" | "admin" };

const links = [
  { href: "/pantry", label: "My pantry" },
  { href: "/recipes", label: "Recipes" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ user: CurrentUser }>("/api/v1/auth/me")
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof Error && cause.message === "Sign in is required") {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        } else {
          setError(cause instanceof Error ? cause.message : "Could not verify your session.");
        }
      })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [pathname, router]);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
      setSigningOut(false);
    }
  }

  if (checking || !user) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div role="status" className="rounded-3xl bg-white/80 px-6 py-5 text-sm font-bold shadow-clay">
          {error ? <><p>{error}</p><Link className="mt-3 inline-block underline" href="/login">Go to sign in</Link></> : "Getting your kitchen ready…"}
        </div>
      </main>
    );
  }

  const allLinks = user.role === "admin" ? [...links, { href: "/admin", label: "Admin" }] : links;
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[#e8d4c7] bg-cream/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-7 lg:px-9">
          <Link href="/pantry" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-2xl bg-coral text-xl font-black shadow-[0_4px_0_#db6e58]">C</span>
            <span className="text-xl font-black tracking-tight">CookMatch</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {allLinks.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-bold transition hover:bg-white/80 ${active ? "bg-white text-cocoa shadow-sm" : "text-[#765b4d]"}`}>{item.label}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm font-extrabold">{user.name}</p>
              <p className="text-xs text-[#765b4d]">{user.role === "admin" ? "Kitchen admin" : "Home cook"}</p>
            </div>
            <button type="button" onClick={signOut} disabled={signingOut} className="min-h-11 rounded-full border border-[#d3b8a5] bg-white/70 px-4 text-sm font-bold transition hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa disabled:opacity-60">
              <span className="hidden sm:inline">{signingOut ? "Signing out…" : "Sign out"}</span><span className="sm:hidden" aria-label="Sign out">Exit</span>
            </button>
          </div>
        </div>
      </header>
      {error && <div role="alert" className="mx-auto mt-4 max-w-7xl px-4 sm:px-7 lg:px-9"><p className="rounded-2xl bg-[#ffe1dd] px-4 py-3 text-sm font-semibold text-[#7b2b22]">{error}</p></div>}
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-7 sm:py-10 lg:px-9">{children}</main>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfc6b6] bg-cream/95 px-3 pb-[max(env(safe-area-inset-bottom),0.65rem)] pt-2 backdrop-blur-xl md:hidden">
        <div className={`mx-auto grid max-w-lg gap-2 ${allLinks.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {allLinks.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`grid min-h-12 place-items-center rounded-2xl text-xs font-extrabold ${active ? "bg-coral/30" : "text-[#765b4d]"}`}>{item.label}</Link>;
          })}
        </div>
      </nav>
    </div>
  );
}
