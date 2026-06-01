"use client";

// Usage: load the panel, read the categories list to find the "Quantum Drive"
// category id, enter that id to load its item attributes
// (attribute_name / value / unit per row).

import { useState } from "react";

export default function DebugQt() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [categoryId, setCategoryId] = useState("");

  function handleDownload() {
    if (data === null) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qt-attributes.json";
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

  async function fetchData(idCategory?: string) {
    setLoading(true);
    setError(null);
    try {
      const url = idCategory
        ? `/api/verify-qt?id_category=${encodeURIComponent(idCategory)}`
        : "/api/verify-qt";
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleClick() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && data === null) {
      await fetchData();
    }
  }

  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (categoryId.trim() !== "") {
      await fetchData(categoryId.trim());
    }
  }

  return (
    <div className="mt-2">
      <button onClick={handleClick} className="text-xs text-text-muted">
        {"{ } qt"}
      </button>
      {open && (
        <div>
          <form onSubmit={handleCategorySubmit} className="mt-1 flex gap-2 items-center">
            <input
              type="number"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="id_category"
              className="text-xs text-text-muted bg-transparent border border-current rounded px-1 w-28"
            />
            <button type="submit" className="text-xs text-text-muted">
              load
            </button>
          </form>
          {loading && <p className="text-xs text-text-muted">Loading…</p>}
          {error && <p className="text-xs text-text-muted">{error}</p>}
          {!loading && !error && data !== null && (
            <>
              <button onClick={handleCopy} className="text-xs text-text-muted mt-2">
                {copied ? "copied" : "copy"}
              </button>
              <button onClick={handleDownload} className="text-xs text-text-muted mt-2 ml-2">
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
