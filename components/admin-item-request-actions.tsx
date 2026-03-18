"use client";

import { useState } from "react";

export default function AdminItemRequestActions({
  requestId,
  requestedName,
}: {
  requestId: number;
  requestedName: string;
}) {
  const [category, setCategory] = useState("Misc");
  const [imageUrl, setImageUrl] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  async function handleApprove() {
    setMessage("");
    setLoading("approve");

    const res = await fetch("/api/admin/item-requests/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        category,
        imageUrl,
        reviewNotes,
      }),
    });

    const data = await res.json();
    setLoading(null);
    setMessage(data.message || data.error || "Done");

    if (res.ok) {
      window.location.reload();
    }
  }

  async function handleReject() {
    setMessage("");
    setLoading("reject");

    const res = await fetch("/api/admin/item-requests/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId,
        reviewNotes,
      }),
    });

    const data = await res.json();
    setLoading(null);
    setMessage(data.message || data.error || "Done");

    if (res.ok) {
      window.location.reload();
    }
  }

  const showPreview = imageUrl.trim().length > 0 && !imagePreviewError;

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-3 text-sm font-semibold text-white">
        Review request for: {requestedName}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Example: Wings"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">
            Image URL
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setImagePreviewError(false);
            }}
            placeholder="Paste official image URL"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
        <p className="mb-3 text-sm font-medium text-zinc-300">Image Preview</p>

        {imageUrl.trim().length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 text-sm text-zinc-500">
            Paste an image URL to preview the item icon
          </div>
        ) : showPreview ? (
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-zinc-800">
              <img
                src={imageUrl}
                alt={`${requestedName} preview`}
                className="h-12 w-12 object-contain"
                onError={() => setImagePreviewError(true)}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">{requestedName}</p>
              <p className="mt-1 text-xs text-zinc-400">Preview loaded successfully</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            Could not load this image URL. Please check the link before approving.
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Review notes (optional)
        </label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={3}
          placeholder="Optional notes for approval or rejection"
          className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={loading !== null}
          className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed"
        >
          {loading === "approve" ? "Approving..." : "Approve Item"}
        </button>

        <button
          type="button"
          onClick={handleReject}
          disabled={loading !== null}
          className="rounded-xl bg-red-400 px-5 py-3 font-bold text-black transition hover:bg-red-300 disabled:cursor-not-allowed"
        >
          {loading === "reject" ? "Rejecting..." : "Reject Request"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
          {message}
        </div>
      ) : null}
    </div>
  );
}