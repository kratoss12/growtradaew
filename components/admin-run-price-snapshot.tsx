"use client";

import { useState } from "react";

export default function AdminRunPriceSnapshot() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRunSnapshot() {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/run-price-snapshot", {
      method: "POST",
    });

    const data = await res.json();

    setLoading(false);
    setMessage(data.message || data.error || "Done");
  }

  return (
    <div className="rounded-3xl border border-yellow-300/15 bg-yellow-400/5 p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 inline-flex rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
            Price History
          </p>

          <h2 className="text-2xl font-bold text-white">
            Run Daily Price Snapshot
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-zinc-300">
            Save today’s median buy and sell prices for all active item markets.
            This builds the data needed for item price charts later.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunSnapshot}
          disabled={loading}
          className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed"
        >
          {loading ? "Running..." : "Run Snapshot"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-100">
          {message}
        </div>
      ) : null}
    </div>
  );
}