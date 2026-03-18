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
  const [loading, setLoading] = useState<string | null>(null);

  async function handleApprove() {
    setMessage("");
    setLoading("approve");

    const res = await fetch("/api/admin/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Done");
    setLoading(null);
    window.location.reload();
  }

  async function handleReject() {
    setMessage("");
    setLoading("reject");

    const res = await fetch("/api/admin/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Done");
    setLoading(null);
    window.location.reload();
  }

  async function handleApprovePromotion() {
    setMessage("");
    setLoading("promotion");

    const res = await fetch("/api/admin/approve-promotion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Done");
    setLoading(null);
    window.location.reload();
  }

  const canApprovePromotion =
    promotionPaymentStatus === "pending_verification";

  function formatPromotionStatus(status?: string | null) {
    switch (status) {
      case "awaiting_donation":
        return "Awaiting Donation";
      case "pending_verification":
        return "Pending Verification";
      case "verified":
        return "Promotion Active";
      case "rejected":
        return "Promotion Rejected";
      case "expired":
        return "Promotion Expired";
      default:
        return null;
    }
  }

  const prettyPromotionStatus = formatPromotionStatus(promotionPaymentStatus);

  return (
    <div style={{ marginTop: "14px" }}>
      {prettyPromotionStatus ? (
        <div
          style={{
            marginBottom: "10px",
            border: "1px solid #27272a",
            background: "#0f172a",
            color: "#e4e4e7",
            borderRadius: "12px",
            padding: "10px 12px",
            fontSize: "14px",
          }}
        >
          Promotion status: <strong>{prettyPromotionStatus}</strong>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          style={{
            padding: "10px 14px",
            border: "1px solid #16a34a",
            borderRadius: "10px",
            cursor: loading !== null ? "not-allowed" : "pointer",
            background: "#16a34a",
            color: "white",
            fontWeight: 700,
          }}
        >
          {loading === "approve" ? "Approving..." : "Approve Listing"}
        </button>

        <button
          onClick={handleReject}
          disabled={loading !== null}
          style={{
            padding: "10px 14px",
            border: "1px solid #dc2626",
            borderRadius: "10px",
            cursor: loading !== null ? "not-allowed" : "pointer",
            background: "#dc2626",
            color: "white",
            fontWeight: 700,
          }}
        >
          {loading === "reject" ? "Rejecting..." : "Reject Listing"}
        </button>

        {canApprovePromotion && (
          <button
            onClick={handleApprovePromotion}
            disabled={loading !== null}
            style={{
              padding: "10px 14px",
              border: "1px solid #ca8a04",
              borderRadius: "10px",
              cursor: loading !== null ? "not-allowed" : "pointer",
              background: "#facc15",
              color: "#111827",
              fontWeight: 700,
            }}
          >
            {loading === "promotion"
              ? "Approving..."
              : "Approve Promotion"}
          </button>
        )}
      </div>

      {message ? (
        <p style={{ marginTop: "10px", color: "#d4d4d8", fontSize: "14px" }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}