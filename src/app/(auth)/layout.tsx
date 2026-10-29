import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-cream px-4 py-10 text-cocoa sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-20 size-72 rounded-full bg-peach/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full bg-mint/70 blur-3xl" />
      <div className="relative z-10 w-full">
        <Link href="/" className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-2xl bg-coral text-xl font-black shadow-[0_4px_0_#db6e58]">C</span>
          <span className="text-xl font-black tracking-tight">CookMatch</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
