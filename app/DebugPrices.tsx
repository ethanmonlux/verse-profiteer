"use client";

import { useState } from "react";

export default function DebugPrices() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (data === null) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed");
    }
  }

  async function handleClick() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && data === null) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/verify-prices");
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="mt-2">
      <button onClick={handleClick} className="text-xs text-text-muted">
        {"{ } prices"}
      </button>
      {open && (
        <div>
          {loading && <p className="text-xs text-text-muted">Loading…</p>}
          {error && <p className="text-xs text-text-muted">{error}</p>}
          {!loading && !error && data !== null && (
            <>
              <button onClick={handleCopy} className="text-xs text-text-muted mt-2">
                {copied ? "copied" : "copy"}
              </button>
              <pre className="text-xs text-text-muted overflow-auto max-h-80 mt-2">
                {JSON.stringify(data, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
