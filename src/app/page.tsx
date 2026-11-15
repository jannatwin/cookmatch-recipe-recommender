import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonPrimary, buttonSecondary } from "@/components/ui";
import { getTranslator } from "@/lib/i18n/server";

export default async function HomePage() {
  const { t, digits } = await getTranslator();
  const highlights = [
    { number: digits("01"), title: t("home.step1Title"), detail: t("home.step1Detail") },
    { number: digits("02"), title: t("home.step2Title"), detail: t("home.step2Detail") },
    { number: digits("03"), title: t("home.step3Title"), detail: t("home.step3Detail") },
  ];
  return (
    <main className="min-h-screen overflow-hidden bg-cream text-cocoa">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-7 lg:px-9">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-cocoa"
        >
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-2xl bg-coral text-xl font-black shadow-button"
          >
            C
          </span>
          <span className="text-xl font-black tracking-tight">CookMatch</span>
        </Link>
        <nav aria-label={t("home.accountNav")} className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/login" className={`${buttonSecondary} hidden px-4 sm:inline-flex`}>
            {t("common.signIn")}
          </Link>
          <Link href="/register" className={`${buttonPrimary} px-4`}>
            {t("home.getStarted")}
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-7 sm:pb-24 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-9 lg:py-24">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-muted">
            <span className="size-2 rounded-full bg-leaf" aria-hidden="true" /> {t("home.badge")}
          </p>
          <h1 className="text-5xl font-black leading-[1.04] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            {t("home.titleBefore")}{" "}
            <span className="relative inline-block whitespace-nowrap">
              {t("home.titleHighlight")}
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-0 z-0 h-4 w-full rounded-full bg-coral/50"
              />
            </span>{" "}
            {t("home.titleAfter")}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted sm:text-xl">
            {t("home.lead")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={buttonPrimary}>
              {t("home.buildPantry")}{" "}
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </Link>
            <Link href="/recipes" className={buttonSecondary}>
              {t("common.browseRecipes")}
            </Link>
          </div>
          <p className="mt-5 text-sm font-semibold text-subtle">
            {t("home.tagline")}
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div
            aria-hidden="true"
            className="absolute -inset-5 rounded-[3rem] bg-peach/60 blur-xl sm:-inset-8"
          />
          <div className="relative rounded-[2.5rem] border border-white/80 bg-paper p-5 shadow-hero sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-clay">
                  {t("home.cardEyebrow")}
                </p>
                <h2 className="mt-1 text-2xl font-black">{t("home.cardTitle")}</h2>
              </div>
              <span
                className="grid size-12 place-items-center rounded-2xl bg-butter text-xl"
                aria-hidden="true"
              >
                ✦
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {t("home.sampleItems")
                .split(", ")
                .map((item, index) => (
                  <span
                    key={item}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${index % 2 ? "bg-peach" : "bg-mint"}`}
                  >
                    {item}
                  </span>
                ))}
            </div>
            <div className="my-6 h-px bg-line" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-subtle">
                  {t("home.sampleLabel")}
                </p>
                <p className="mt-1 text-lg font-black">{t("home.sampleRecipe")}</p>
                <p className="mt-1 text-sm text-muted">{t("home.sampleMeta")}</p>
              </div>
              <div className="grid size-[4.25rem] shrink-0 place-items-center rounded-full border-[5px] border-mint-deep bg-mint text-center text-sm font-black leading-tight">
                {t("home.samplePercent")}
                <span className="block text-[9px]">{t("home.sampleMatch")}</span>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-butter/70 px-4 py-3 text-sm font-semibold">
              <span className="mr-2" aria-hidden="true">
                ◷
              </span>
              {t("home.sampleTip")}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute -right-2 -top-5 grid size-14 place-items-center rounded-[1.2rem] bg-lavender text-2xl shadow-clay sm:-right-5"
          >
            ♡
          </div>
          <div
            aria-hidden="true"
            className="absolute -bottom-5 -left-3 grid size-12 place-items-center rounded-2xl bg-mint text-xl shadow-clay"
          >
            ✓
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-7 sm:pb-24 lg:px-9">
        <div className="rounded-[2.5rem] bg-peach-soft p-6 sm:p-10 lg:p-12">
          <div className="mb-8 max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-clay">{t("home.stepsEyebrow")}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {t("home.stepsTitle")}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {highlights.map((step) => (
              <article key={step.number} className="rounded-[1.8rem] border border-white/80 bg-white/75 p-6">
                <p className="text-sm font-black text-clay">{step.number}</p>
                <h3 className="mt-4 text-xl font-extrabold">{step.title}</h3>
                <p className="mt-2 leading-6 text-muted">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <footer className="border-t border-line px-4 py-6 text-center text-sm text-muted">
        {t("home.footer")}
      </footer>
    </main>
  );
}
