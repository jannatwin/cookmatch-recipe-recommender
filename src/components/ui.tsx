import Image from "next/image";
import type { ReactNode } from "react";

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b604d]">{eyebrow}</p>}
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-base leading-7 text-[#765b4d]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-clay sm:p-7 ${className}`}>{children}</section>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border-2 border-dashed border-[#dfc6b6] bg-white/40 px-6 py-12 text-center">
      <div aria-hidden="true" className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-butter text-2xl">✦</div>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#765b4d]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function RecipeImage({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div role="img" className={`grid place-items-center bg-gradient-to-br from-peach via-butter to-mint text-5xl ${className}`} aria-label={`${alt}, no image available`}>
        <span aria-hidden="true">◌</span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-peach ${className}`}>
      <Image src={src} alt={alt} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized className="object-cover" />
    </div>
  );
}

export const buttonPrimary = "inline-flex min-h-11 items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-extrabold text-cocoa shadow-[0_5px_0_#db6e58] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 active:shadow-[0_2px_0_#db6e58] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
export const buttonSecondary = "inline-flex min-h-11 items-center justify-center rounded-full border border-[#d8bca9] bg-white/80 px-5 py-2.5 text-sm font-bold text-cocoa transition hover:bg-white focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa disabled:cursor-not-allowed disabled:opacity-50";
export const inputClass = "min-h-12 w-full rounded-2xl border border-[#d3b8a5] bg-white px-4 py-3 text-base text-cocoa shadow-inner outline-none transition placeholder:text-[#9c8171] focus:border-coral focus:ring-4 focus:ring-coral/20";
