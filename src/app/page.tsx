import Link from "next/link";
import { buttonPrimary, buttonSecondary } from "@/components/ui";

const highlights = [
  { number: "01", title: "Stock your pantry", detail: "Keep track of what is already in your kitchen." },
  { number: "02", title: "Find your match", detail: "See recipes ranked by the ingredients you have." },
  { number: "03", title: "Cook with less waste", detail: "Use ingredients before they reach their expiry date." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream text-cocoa">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-7 lg:px-9">
        <Link href="/" className="flex items-center gap-2.5 rounded-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-2xl bg-coral text-xl font-black shadow-[0_4px_0_#db6e58]">C</span>
          <span className="text-xl font-black tracking-tight">CookMatch</span>
        </Link>
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/login" className={`${buttonSecondary} px-4`}>Sign in</Link>
          <Link href="/register" className={`${buttonPrimary} px-4`}>Get started</Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-7 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-9 lg:py-24">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e8d4c7] bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#765b4d]">
            <span className="size-2 rounded-full bg-[#64a77c]" aria-hidden="true" /> Good food starts at home
          </p>
          <h1 className="text-5xl font-black leading-[1.04] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            What can you <span className="relative inline-block whitespace-nowrap">cook<span aria-hidden="true" className="absolute -bottom-1 left-0 z-0 h-4 w-full rounded-full bg-coral/50" /></span> with what you have?
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#765b4d] sm:text-xl">
            Add what is in your kitchen. CookMatch finds the recipes that fit, spots what is missing, and helps you waste less.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={buttonPrimary}>Build my pantry <span aria-hidden="true" className="ml-2">→</span></Link>
            <Link href="/login" className={buttonSecondary}>I already have an account</Link>
          </div>
          <p className="mt-5 text-sm font-semibold text-[#8b7061]">A little less food waste. A lot more dinner inspiration.</p>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div aria-hidden="true" className="absolute -inset-5 rounded-[3rem] bg-peach/60 blur-xl sm:-inset-8" />
          <div className="relative rounded-[2.5rem] border border-white/80 bg-[#fffaf4] p-5 shadow-[16px_18px_40px_rgb(120_70_50_/_18%)] sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#8b604d]">Tonight’s kitchen</p><h2 className="mt-1 text-2xl font-black">Your pantry, at a glance</h2></div>
              <span className="grid size-12 place-items-center rounded-2xl bg-butter text-xl" aria-hidden="true">✦</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Eggs", "Tomatoes", "Rice", "Onion", "Garlic", "Olive oil"].map((item, index) => <span key={item} className={`rounded-full px-4 py-2 text-sm font-bold ${index % 2 ? "bg-peach" : "bg-mint"}`}>{item}</span>)}
            </div>
            <div className="my-6 h-px bg-[#ead9cd]" />
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#8b7061]">Sample pantry match</p><p className="mt-1 text-lg font-black">Tomato egg curry</p><p className="mt-1 text-sm text-[#765b4d]">Ready in 25 minutes · 1 item missing</p></div>
              <div className="grid size-[4.25rem] shrink-0 place-items-center rounded-full border-[5px] border-[#8ecaa6] bg-mint text-center text-sm font-black leading-tight">80%<span className="block text-[9px]">MATCH</span></div>
            </div>
            <div className="mt-5 rounded-2xl bg-butter/70 px-4 py-3 text-sm font-semibold"><span className="mr-2" aria-hidden="true">◷</span>Your tomatoes are nearly ripe. Use them tonight.</div>
          </div>
          <div aria-hidden="true" className="absolute -right-2 -top-5 grid size-14 place-items-center rounded-[1.2rem] bg-lavender text-2xl shadow-clay sm:-right-5">♡</div>
          <div aria-hidden="true" className="absolute -bottom-5 -left-3 grid size-12 place-items-center rounded-2xl bg-mint text-xl shadow-clay">✓</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-7 sm:pb-24 lg:px-9">
        <div className="rounded-[2.5rem] bg-[#f9e5d7] p-6 sm:p-10 lg:p-12">
          <div className="mb-8 max-w-xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#8b604d]">Simple as supper</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">A good meal is already in there.</h2></div>
          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((step) => <article key={step.number} className="rounded-[1.8rem] border border-white/80 bg-white/75 p-6">
              <p className="text-sm font-black text-[#b36b54]">{step.number}</p><h3 className="mt-4 text-xl font-extrabold">{step.title}</h3><p className="mt-2 leading-6 text-[#765b4d]">{step.detail}</p>
            </article>)}
          </div>
        </div>
      </section>
      <footer className="border-t border-[#e8d4c7] px-4 py-6 text-center text-sm text-[#765b4d]">CookMatch · Make something good with what you have.</footer>
    </main>
  );
}
