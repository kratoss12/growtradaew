"use client";

import { useState } from "react";

export default function PromoteListingButtons({
  listingId,
}: {
  listingId: number;
}) {
  const [message, setMessage] = useState("");
  const [loadingDays, setLoadingDays] = useState<number | null>(null);

  async function handlePromote(promotionDays: number) {
    setMessage("");
    setLoadingDays(promotionDays);

    const res = await fetch("/api/listings/promote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId, promotionDays }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Done");
    setLoadingDays(null);
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>Promote this listing</p>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => handlePromote(3)}
          disabled={loadingDays !== null}
          style={{
            padding: "8px 12px",
            border: "1px solid #ca8a04",
            borderRadius: "8px",
            cursor: loadingDays !== null ? "not-allowed" : "pointer",
            background: "#fef3c7",
          }}
        >
          {loadingDays === 3 ? "Requesting..." : "Promote 3 Days"}
        </button>

        <button
          type="button"
          onClick={() => handlePromote(5)}
          disabled={loadingDays !== null}
          style={{
            padding: "8px 12px",
            border: "1px solid #ca8a04",
            borderRadius: "8px",
            cursor: loadingDays !== null ? "not-allowed" : "pointer",
            background: "#fde68a",
          }}
        >
          {loadingDays === 5 ? "Requesting..." : "Promote 5 Days"}
        </button>

        <button
          type="button"
          onClick={() => handlePromote(7)}
          disabled={loadingDays !== null}
          style={{
            padding: "8px 12px",
            border: "1px solid #ca8a04",
            borderRadius: "8px",
            cursor: loadingDays !== null ? "not-allowed" : "pointer",
            background: "#fcd34d",
          }}
        >
          {loadingDays === 7 ? "Requesting..." : "Promote 7 Days"}
        </button>
      </div>

      {message && <p style={{ marginTop: "10px" }}>{message}</p>}
    </div>
  );
}