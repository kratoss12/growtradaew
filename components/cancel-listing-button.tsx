"use client";

import { useState } from "react";

export default function CancelListingButton({
  listingId,
}: {
  listingId: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this listing?"
    );

    if (!confirmed) return;

    setLoading(true);

    const res = await fetch("/api/listings/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to cancel listing.");
      setLoading(false);
      return;
    }

    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      style={{
        padding: "10px 14px",
        borderRadius: "10px",
        border: "1px solid rgba(239,68,68,0.3)",
        background: "rgba(239,68,68,0.12)",
        color: "#f87171",
        fontSize: "14px",
        fontWeight: 700,
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Cancelling..." : "Cancel Listing"}
    </button>
  );
}