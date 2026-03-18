"use client";

import { useMemo, useState } from "react";

function getMinutesLeft(createdAt: string | null | undefined) {
  if (!createdAt) return null;
  const requested = new Date(createdAt).getTime();
  const expires = requested + 20 * 60 * 1000;
  const diff = expires - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (60 * 1000));
}

function formatListingPaymentStatus(status: string | null | undefined) {
  switch (status) {
    case "awaiting_donation":
      return "Awaiting Donation";
    case "pending_verification":
      return "Pending Verification";
    case "verified":
      return "Listing Verified";
    case "rejected":
      return "Listing Rejected";
    case "expired":
      return "Listing Expired";
    default:
      return null;
  }
}

export default function HighValueListingActions({
  listingId,
  paymentStatus,
  assignedWorld,
  paymentRequiredBgl,
  createdAt,
}: {
  listingId: number;
  paymentStatus?: string | null;
  assignedWorld?: string | null;
  paymentRequiredBgl?: number | null;
  createdAt?: string | null;
}) {
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  const niceStatus = formatListingPaymentStatus(paymentStatus);
  const minutesLeft = useMemo(() => getMinutesLeft(createdAt), [createdAt]);

  const isAwaitingDonation = paymentStatus === "awaiting_donation";
  const isPendingVerification = paymentStatus === "pending_verification";

  async function handleConfirmDonation() {
    setMessage("");
    setConfirming(true);

    const res = await fetch("/api/listings/confirm-donation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Done");
    setConfirming(false);

    if (res.ok) {
      window.location.reload();
    }
  }

  return (
    <div style={{ marginTop: "12px" }}>
      <p
        style={{
          margin: "0 0 10px 0",
          fontWeight: 700,
          color: "white",
          fontSize: "15px",
        }}
      >
        High-value listing verification
      </p>

      <div
        style={{
          marginBottom: "12px",
          border: "1px solid rgba(34,197,94,0.22)",
          background: "rgba(34,197,94,0.08)",
          borderRadius: "12px",
          padding: "12px 14px",
          fontSize: "14px",
          lineHeight: 1.6,
          color: "#f5f5f5",
        }}
      >
        Listings worth 50 BGL or more require a 1 BGL deposit and admin verification before they go live.
      </div>

      {niceStatus ? (
        <div
          style={{
            marginBottom: "12px",
            border: "1px solid #27272a",
            background: "#0f172a",
            color: "#e4e4e7",
            borderRadius: "12px",
            padding: "12px 14px",
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          Status: <strong>{niceStatus}</strong>
        </div>
      ) : null}

      {isAwaitingDonation ? (
        <>
          <div
            style={{
              marginBottom: "12px",
              border: "1px solid #27272a",
              background: "#0f172a",
              color: "#e4e4e7",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            Donate <strong>{paymentRequiredBgl ?? 1} BGL</strong> in world{" "}
            <strong>{assignedWorld || "Unknown"}</strong>.
            <br />
            Then click <strong>Confirm Donation</strong>.
            {minutesLeft !== null ? (
              <>
                <br />
                Time left: <strong>{minutesLeft} minute{minutesLeft === 1 ? "" : "s"}</strong>
              </>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleConfirmDonation}
            disabled={confirming}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #22c55e",
              background: "#22c55e",
              color: "#111827",
              fontSize: "14px",
              fontWeight: 700,
              cursor: confirming ? "not-allowed" : "pointer",
              marginBottom: "12px",
            }}
          >
            {confirming ? "Confirming..." : "Confirm Donation"}
          </button>
        </>
      ) : isPendingVerification ? (
        <div
          style={{
            marginBottom: "12px",
            border: "1px solid #27272a",
            background: "#0f172a",
            color: "#e4e4e7",
            borderRadius: "12px",
            padding: "12px 14px",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          Your donation has been confirmed by you and is now waiting for admin review.
        </div>
      ) : null}

      {message ? (
        <div
          style={{
            marginTop: "12px",
            border: "1px solid #3f3f46",
            background: "#0f172a",
            color: "#e4e4e7",
            borderRadius: "12px",
            padding: "12px 14px",
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}