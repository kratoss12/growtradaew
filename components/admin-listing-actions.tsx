"use client";

import { useState } from "react";

export default function AdminListingActions({
  listingId,
  promotionPaymentStatus,
}: {
  listingId: number;
  promotionPaymentStatus?: string | null;
}) {
  const [message, setMessage] = useState("");

  async function handleApprove() {
    setMessage("");

    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Done");
    window.location.reload();
  }

  async function handleReject() {
    setMessage("");

    const res = await fetch("/api/admin/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Done");
    window.location.reload();
  }

  async function handleApprovePromotion() {
    setMessage("");

    const res = await fetch("/api/admin/approve-promotion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Done");
    window.location.reload();
  }

  const canApprovePromotion =
    promotionPaymentStatus === "waiting_donation" ||
    promotionPaymentStatus === "pending_verification";

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={handleApprove}
          style={{
            padding: "8px 12px",
            border: "1px solid #16a34a",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Approve
        </button>

        <button
          onClick={handleReject}
          style={{
            padding: "8px 12px",
            border: "1px solid #dc2626",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Reject
        </button>

        {canApprovePromotion && (
          <button
            onClick={handleApprovePromotion}
            style={{
              padding: "8px 12px",
              border: "1px solid #ca8a04",
              borderRadius: "8px",
              cursor: "pointer",
              background: "#fef3c7",
            }}
          >
            Approve Promotion
          </button>
        )}
      </div>

      {message && <p style={{ marginTop: "8px" }}>{message}</p>}
    </div>
  );
}