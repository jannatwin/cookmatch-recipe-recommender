"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { apiRequest } from "@/lib/client-api";
import { IngredientCatalog, type CatalogIngredient } from "@/components/ingredient-catalog";
import { PantryItemCard, today, type PantryItem } from "@/components/pantry-item-card";
import { buttonPrimary, buttonSecondary, EmptyState, inputClass, PageHeading, Panel } from "@/components/ui";

type Suggestion = { ingredientId: number; name: string; matchedAlias: string | null };

export function PantryWorkspace() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [catalog, setCatalog] = useState<CatalogIngredient[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [noMatchFor, setNoMatchFor] = useState("");
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
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Could not load your pantry."),
      )
      .finally(() => setLoading(false));
    apiRequest<{ data: Array<{ ingredientId: number; name: string }> }>("/api/v1/ingredients")
      .then(({ data }) => setCatalog(data))
      .catch(() => {}); // the picker is optional; typing still works
  }, []);

  useEffect(() => {
    // Several ingredients can be entered separated by commas; suggest for the one being typed.
    const text = query.slice(query.lastIndexOf(",") + 1).trim();
    if (!text) return;
    let active = true; // ignore responses that arrive after the query changed
    const timeout = window.setTimeout(() => {
      apiRequest<{ data: Suggestion[] }>(`/api/v1/ingredients/search?q=${encodeURIComponent(text)}&limit=8`)
        .then(({ data }) => {
          if (active) {
            setSuggestions(data);
            setActiveSuggestion(0);
            setNoMatchFor(data.length ? "" : text);
          }
        })
        .catch(() => {
          if (active) setSuggestions([]);
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  function chooseSuggestion(suggestion: Suggestion) {
    setQuery(
      (current) =>
        `${current.slice(0, current.lastIndexOf(",") + 1)}${current.includes(",") ? " " : ""}${suggestion.name}, `,
    );
    setSuggestions([]);
    setNoMatchFor("");
    inputRef.current?.focus();
  }

  function pickFromCatalog(name: string) {
    setQuery((current) => {
      const typed = current.trim();
      return `${typed && !typed.endsWith(",") ? `${typed}, ` : current}${name}, `;
    });
    setSuggestions([]);
    setNoMatchFor("");
    inputRef.current?.focus();
  }

  function handleSuggestionKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((index) => (index + suggestions.length - 1) % suggestions.length);
    } else if ((event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) && suggestions.length) {
      // Tab completes only while suggestions are open; otherwise it moves focus as usual.
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
    }
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const names = [
      ...new Set(
        query
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    ];
    if (!names.length) return;
    setBusy(true);
    setError("");
    setNotice("");
    setSuggestions([]);
    setNoMatchFor("");
    setQuery(""); // clear now, so anything typed while the requests run is kept
    const added: string[] = [];
    const failed: Array<{ name: string; reason: string }> = [];
    // Names are resolved by the server against ingredient names and aliases, one request each
    // so a single unknown or duplicate name does not block the others.
    for (const name of names) {
      try {
        const created = await apiRequest<PantryItem>("/api/v1/pantry/items", {
          method: "POST",
          body: JSON.stringify({ name, expiryDate: expiryDate || null }),
        });
        added.push(created.name);
      } catch (cause) {
        failed.push({
          name,
          reason: cause instanceof Error ? cause.message : "Could not add that ingredient.",
        });
      }
    }
    if (added.length) {
      setNotice(`${added.join(", ")} added to your pantry.`);
      await loadPantry();
    }
    if (failed.length)
      setError(
        failed.length === 1
          ? failed[0].reason
          : failed.map((item) => `${item.name}: ${item.reason}`).join(" · "),
      );
    else setExpiryDate("");
    // Put back only what still needs fixing, ahead of anything typed in the meantime.
    if (failed.length)
      setQuery((current) => [...failed.map((item) => item.name), current].filter(Boolean).join(", "));
    setBusy(false);
  }

  async function saveDate(item: PantryItem) {
    setBusyId(item.ingredientId);
    setError("");
    setNotice("");
    try {
      await apiRequest<PantryItem>(`/api/v1/pantry/items/${item.ingredientId}`, {
        method: "PATCH",
        body: JSON.stringify({ expiryDate: dates[item.ingredientId] || null }),
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
        action={
          <Link href="/recipes" className={buttonPrimary}>
            Find recipes{" "}
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        }
      />
      <Panel className="mb-7">
        <div className="mb-5 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint text-xl"
          >
            ＋
          </span>
          <div>
            <h2 className="text-xl font-extrabold">Add ingredients</h2>
            <p className="mt-1 text-sm text-muted">
              Start typing to see matching ingredients, then press Tab or Enter to complete. Separate several
              with commas.
            </p>
          </div>
        </div>
        <form onSubmit={addItem} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_auto] lg:items-end">
          <div className="relative">
            <label htmlFor="ingredient-search" className="mb-2 block text-sm font-bold">
              Ingredients
            </label>
            <input
              id="ingredient-search"
              value={query}
              ref={inputRef}
              onChange={(event) => {
                setQuery(event.target.value);
                setSuggestions([]);
                setNoMatchFor("");
              }}
              onKeyDown={handleSuggestionKeys}
              className={inputClass}
              placeholder="e.g. egg, tomato, piyaj"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              aria-controls="ingredient-suggestions"
              aria-activedescendant={
                suggestions[activeSuggestion]
                  ? `ingredient-option-${suggestions[activeSuggestion].ingredientId}`
                  : undefined
              }
            />
            {suggestions.length > 0 && (
              <ul
                id="ingredient-suggestions"
                role="listbox"
                aria-label="Ingredient suggestions"
                className="absolute inset-x-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-2xl border border-line-strong bg-white p-2 shadow-xl"
              >
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.ingredientId}
                    id={`ingredient-option-${suggestion.ingredientId}`}
                    role="option"
                    aria-selected={index === activeSuggestion}
                  >
                    <button
                      type="button"
                      onClick={() => chooseSuggestion(suggestion)}
                      className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-bold hover:bg-mint/60 focus-visible:outline-4 focus-visible:outline-cocoa ${index === activeSuggestion ? "bg-mint/50" : ""}`}
                    >
                      <span>{suggestion.name}</span>
                      <span className="text-xs font-medium text-muted">
                        {suggestion.matchedAlias ? `alias: ${suggestion.matchedAlias}` : "ingredient"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {noMatchFor && (
              <p role="status" className="mt-2 text-sm font-semibold text-danger">
                No ingredient matches “{noMatchFor}”. Check the spelling or try another name.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="new-expiry" className="mb-2 block text-sm font-bold">
              Expiry date <span className="font-medium text-subtle">(optional)</span>
            </label>
            <input
              id="new-expiry"
              type="date"
              min={today()}
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={busy || !query.trim()} className={buttonPrimary}>
            {busy ? "Adding…" : "Add to pantry"}
          </button>
        </form>
        <IngredientCatalog ingredients={catalog} pantry={items} onPick={pickFromCatalog} />
      </Panel>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-2xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-5 rounded-2xl bg-mint px-4 py-3 text-sm font-semibold">
          {notice}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold">
            In your kitchen <span className="ml-1 text-sm font-bold text-subtle">{items.length}</span>
          </h2>
        </div>
        {items.some((item) => item.expiringSoon) && (
          <p className="rounded-full bg-butter px-3 py-1.5 text-xs font-extrabold">
            Use soon: {items.filter((item) => item.expiringSoon).length}
          </p>
        )}
      </div>
      {loading ? (
        <div role="status" className="rounded-3xl bg-white/60 px-5 py-10 text-center font-semibold">
          Loading your pantry…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Your pantry is ready for a first ingredient"
          description="Add a few things you have at home, then we’ll match them with recipes you can make."
          action={
            <Link href="#ingredient-search" className={buttonSecondary}>
              Add your first ingredient
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.ingredientId}>
              <PantryItemCard
                item={item}
                date={dates[item.ingredientId] ?? ""}
                busy={busyId === item.ingredientId}
                onDateChange={(value) => setDates((current) => ({ ...current, [item.ingredientId]: value }))}
                onSave={() => void saveDate(item)}
                onRemove={() => void removeItem(item)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
