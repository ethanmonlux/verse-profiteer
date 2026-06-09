"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SheetOption = { id: number; primary: string; secondary?: string };

export default function SearchableSheet({
  label,
  options,
  selectedId,
  placeholderPrimary,
  allOptionLabel,
  onSelect,
}: {
  label: string;
  options: SheetOption[];
  selectedId?: number;
  placeholderPrimary: string;
  allOptionLabel: string;
  onSelect: (id: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  function handleSelect(id: number | undefined) {
    onSelect(id);
    close();
  }

  const q = query.toLowerCase();
  const filtered =
    q === ""
      ? options
      : options.filter(
          (o) =>
            o.primary.toLowerCase().includes(q) ||
            (o.secondary?.toLowerCase().includes(q) ?? false),
        );

  const selectedOption = options.find((o) => o.id === selectedId);
  const triggerLabel = selectedOption ? selectedOption.primary : placeholderPrimary;
  const isPlaceholder = selectedOption === undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded border border-border bg-bg-card text-sm px-3 py-1 ${
          isPlaceholder ? "text-text-muted" : "text-accent"
        }`}
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={close} />
          <div
            className="relative bg-bg-card rounded-t-lg flex flex-col overflow-hidden max-h-[85svh]"
            style={{
              animation: reducedMotion ? undefined : "slideUp 0.2s ease-out",
            }}
          >
            <div className="flex-none bg-bg-card border-b border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{label}</span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="text-text-muted text-sm leading-none px-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  ✕
                </button>
              </div>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-bg-card border border-border rounded text-sm px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              />
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 overscroll-contain">
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className={`w-full text-left px-4 min-h-11 flex items-center border-l-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  selectedId === undefined
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted"
                }`}
              >
                <span className="text-sm">{allOptionLabel}</span>
              </button>
              {filtered.length === 0 ? (
                <div className="px-4 min-h-11 flex items-center text-sm text-text-muted">
                  No matches
                </div>
              ) : (
                filtered.map((o) => {
                  const isSelected = o.id === selectedId;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handleSelect(o.id)}
                      className={`w-full text-left px-4 py-2 min-h-11 flex flex-col justify-center border-l-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                        isSelected ? "border-accent text-accent" : "border-transparent"
                      }`}
                    >
                      <span className="text-sm">{o.primary}</span>
                      {o.secondary && (
                        <span className="text-xs text-text-muted">{o.secondary}</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
