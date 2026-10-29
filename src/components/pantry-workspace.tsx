"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { apiRequest } from "@/lib/client-api";
import { buttonPrimary, buttonSecondary, EmptyState, inputClass, PageHeading, Panel } from "@/components/ui";

type PantryItem = { ingredientId: number; name: string; expiryDate: string | null; expiringSoon: boolean };
type Suggestion = { ingredientId: number; name: string; matchedAlias: string | null };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function prettyDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PantryWorkspace() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [dates, setDates] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPantry = useCallback(async () => {
    try {
      const result = await apiRequest<{ data: PantryItem[] }>("/api/v1/pantry");
      setItems(result.data);
      setDates(Object.fromEntries(result.data.map((item) => [item.ingredientId, item.expiryDate ?? ""])));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your pantry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiRequest<{ data: PantryItem[] }>("/api/v1/pantry")
      .then(({ data }) => {
        setItems(data);
        setDates(Object.fromEntries(data.map((item) => [item.ingredientId, item.expiryDate ?? ""])));
        setError("");
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load your pantry."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2 || selected?.name === text) return;
    const timeout = window.setTimeout(() => {
      apiRequest<{ data: Suggestion[] }>(`/api/v1/ingredients/search?q=${encodeURIComponent(text)}&limit=8`)
        .then(({ data }) => { setSuggestions(data); setActiveSuggestion(0); })
        .catch(() => setSuggestions([]));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [query, selected]);

  function chooseSuggestion(suggestion: Suggestion) {
    setSelected(suggestion);
    setQuery(suggestion.name);
    setSuggestions([]);
  }

  function handleSuggestionKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((index) => (index + suggestions.length - 1) % suggestions.length);
    } else if (event.key === "Enter" && suggestions.length) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setError("Choose an ingredient from the suggestions so it matches your catalog.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest<PantryItem>("/api/v1/pantry/items", {
        method: "POST",
        body: JSON.stringify({ ingredientId: selected.ingredientId, expiryDate: expiryDate || null }),
      });
      setQuery("");
      setSelected(null);
      setExpiryDate("");
      setNotice(`${selected.name} added to your pantry.`);
      await loadPantry();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add that ingredient.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDate(item: PantryItem) {
    setBusyId(item.ingredientId);
    setError("");
    setNotice("");
    try {
      await apiRequest<PantryItem>(`/api/v1/pantry/items/${item.ingredientId}`, {
        method: "PATCH", body: JSON.stringify({ expiryDate: dates[item.ingredientId] || null }),
      });
      setNotice(`${item.name} expiry date updated.`);
      await loadPantry();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the expiry date.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item: PantryItem) {
    setBusyId(item.ingredientId);
    setError("");
    setNotice("");
    try {
      await apiRequest<void>(`/api/v1/pantry/items/${item.ingredientId}`, { method: "DELETE" });
      setItems((current) => current.filter((entry) => entry.ingredientId !== item.ingredientId));
      setNotice(`${item.name} removed from your pantry.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove that ingredient.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Your kitchen, organized"
        title="My pantry"
        description="Keep the ingredients you have on hand in one place. Add expiry dates to use the freshest food first."
        action={<Link href="/recipes" className={buttonPrimary}>Find recipes <span aria-hidden="true" className="ml-2">→</span></Link>}
      />
      <Panel className="mb-7">
        <div className="mb-5 flex items-start gap-3">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint text-xl">＋</span>
          <div><h2 className="text-xl font-extrabold">Add an ingredient</h2><p className="mt-1 text-sm text-[#765b4d]">Search by name or a known alias.</p></div>
        </div>
        <form onSubmit={addItem} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_auto] lg:items-end">
          <div className="relative">
            <label htmlFor="ingredient-search" className="mb-2 block text-sm font-bold">Ingredient</label>
            <input
              id="ingredient-search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); setSuggestions([]); }}
              onKeyDown={handleSuggestionKeys} className={inputClass} placeholder="Try tomato or piyaj" autoComplete="off"
              role="combobox" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls="ingredient-suggestions"
            />
            {suggestions.length > 0 && <ul id="ingredient-suggestions" role="listbox" aria-label="Ingredient suggestions" className="absolute inset-x-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-2xl border border-[#dec7b8] bg-white p-2 shadow-xl">
              {suggestions.map((suggestion, index) => <li key={suggestion.ingredientId} role="option" aria-selected={index === activeSuggestion}>
                <button type="button" onClick={() => chooseSuggestion(suggestion)} className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-bold hover:bg-mint/60 focus-visible:outline-4 focus-visible:outline-cocoa ${index === activeSuggestion ? "bg-mint/50" : ""}`}>
                  <span>{suggestion.name}</span><span className="text-xs font-medium text-[#765b4d]">{suggestion.matchedAlias ? `alias: ${suggestion.matchedAlias}` : "ingredient"}</span>
                </button>
              </li>)}
            </ul>}
          </div>
          <div>
            <label htmlFor="new-expiry" className="mb-2 block text-sm font-bold">Expiry date <span className="font-medium text-[#8b7061]">(optional)</span></label>
            <input id="new-expiry" type="date" min={today()} value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={busy || !selected} className={buttonPrimary}>{busy ? "Adding…" : "Add to pantry"}</button>
        </form>
      </Panel>

      {error && <p role="alert" className="mb-5 rounded-2xl bg-[#ffe1dd] px-4 py-3 text-sm font-semibold text-[#7b2b22]">{error}</p>}
      {notice && <p role="status" className="mb-5 rounded-2xl bg-mint px-4 py-3 text-sm font-semibold">{notice}</p>}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-extrabold">In your kitchen <span className="ml-1 text-sm font-bold text-[#8b7061]">{items.length}</span></h2></div>
        {items.some((item) => item.expiringSoon) && <p className="rounded-full bg-butter px-3 py-1.5 text-xs font-extrabold">Use soon: {items.filter((item) => item.expiringSoon).length}</p>}
      </div>
      {loading ? <div role="status" className="rounded-3xl bg-white/60 px-5 py-10 text-center font-semibold">Loading your pantry…</div>
        : items.length === 0 ? <EmptyState title="Your pantry is ready for a first ingredient" description="Add a few things you have at home, then we’ll match them with recipes you can make." action={<Link href="#ingredient-search" className={buttonSecondary}>Add your first ingredient</Link>} />
          : <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => <li key={item.ingredientId}>
              <article className="h-full rounded-[1.6rem] border border-white/80 bg-white/75 p-4 shadow-clay sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-2xl text-lg ${item.expiringSoon ? "bg-butter" : "bg-mint"}`}>✓</span>
                    <div className="min-w-0"><h3 className="truncate font-extrabold">{item.name}</h3><p className="mt-0.5 text-xs text-[#765b4d]">{item.expiryDate ? `Expires ${prettyDate(item.expiryDate)}` : "No expiry date"}</p></div>
                  </div>
                  {item.expiringSoon && <span className="shrink-0 rounded-full bg-butter px-2.5 py-1 text-[11px] font-extrabold">Use soon</span>}
                </div>
                <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2">
                  <div><label htmlFor={`expiry-${item.ingredientId}`} className="mb-1.5 block text-xs font-bold">Expiry date</label><input id={`expiry-${item.ingredientId}`} type="date" min={today()} value={dates[item.ingredientId] ?? ""} onChange={(event) => setDates((current) => ({ ...current, [item.ingredientId]: event.target.value }))} className="min-h-11 w-full min-w-0 rounded-xl border border-[#d3b8a5] bg-white px-2 text-sm outline-none focus:ring-4 focus:ring-coral/20" /></div>
                  <button type="button" onClick={() => void saveDate(item)} disabled={busyId === item.ingredientId} className="min-h-11 rounded-xl bg-lavender/70 px-3 text-xs font-extrabold transition hover:bg-lavender focus-visible:outline-4 focus-visible:outline-cocoa">Save</button>
                  <button type="button" onClick={() => void removeItem(item)} disabled={busyId === item.ingredientId} className="min-h-11 rounded-xl border border-[#e8c2b9] bg-white px-3 text-xs font-extrabold text-[#833d32] transition hover:bg-[#fff0ed] focus-visible:outline-4 focus-visible:outline-[#833d32]">Remove</button>
                </div>
              </article>
            </li>)}
          </ul>}
    </>
  );
}
