"use client";

import { useState } from "react";

export default function DebugTerminals() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleDownload(filename: string) {
    if (data === null) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

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
        const res = await fetch("/api/verify-terminals");
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
        {"{ } terminals"}
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
              <button onClick={() => handleDownload("terminals.json")} className="text-xs text-text-muted mt-2 ml-2">
                download
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
