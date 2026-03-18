"use client";

import { useMemo, useState } from "react";

function formatPromotionPrice(value: number | null | undefined) {
  if (value === 0.7) return "70 DL";
  if (value === 1) return "1 BGL";
  if (value === 2) return "2 BGL";
  if (value == null) return "Unknown";
  return `${value} BGL`;
}

function formatPromotionStatus(status: string | null | undefined) {
  switch (status) {
    case "awaiting_donation":
    case "waiting_donation":
      return "Awaiting Donation";
    case "pending_verification":
      return "Pending Verification";
    case "active":
      return "Promotion Active";
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

function getMinutesLeft(requestedAt: string | null | undefined) {
  if (!requestedAt) return null;
  const requested = new Date(requestedAt).getTime();
  const expires = requested + 20 * 60 * 1000;
  const diff = expires - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (60 * 1000));
}

function getCurrencyClass(text: string) {
  if (text.includes("DL")) return "text-sky-300";
  if (text.includes("BGL")) return "text-blue-400";
  return "text-yellow-300";
}

export default function PromoteListingButtons({
  listingId,
  promotionPaymentStatus,
  promotionAssignedWorld,
  promotionPaymentRequiredBgl,
  promotionRequestedAt,
}: {
  listingId: number;
  promotionPaymentStatus?: string | null;
  promotionAssignedWorld?: string | null;
  promotionPaymentRequiredBgl?: number | null;
  promotionRequestedAt?: string | null;
}) {
  const [message, setMessage] = useState("");
  const [loadingDays, setLoadingDays] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  const niceStatus = formatPromotionStatus(promotionPaymentStatus);
  const minutesLeft = useMemo(
    () => getMinutesLeft(promotionRequestedAt),
    [promotionRequestedAt]
  );

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

    if (res.ok) {
      window.location.reload();
    }
  }

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

  const isAwaitingDonation =
    promotionPaymentStatus === "awaiting_donation" ||
    promotionPaymentStatus === "waiting_donation";

  const isPendingVerification =
    promotionPaymentStatus === "pending_verification";

  const promotionPriceLabel = formatPromotionPrice(promotionPaymentRequiredBgl);

  return (
    <div className="mt-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-extrabold text-white">
            Promote this listing
          </p>
          <p className="mt-1 text-sm text-zinc-300">
            Get more visibility on the marketplace and item page.
          </p>
        </div>

        {niceStatus ? (
          <div className="rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-yellow-200">
            {niceStatus}
          </div>
        ) : null}
      </div>

      <div className="mb-4 rounded-2xl border border-yellow-300/15 bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent p-4">
        <p className="text-sm leading-6 text-zinc-100">
          Promoted listings appear above normal listings and stand out with a highlighted badge on the marketplace and item page.
        </p>
      </div>

      {isAwaitingDonation ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-300/15 bg-blue-400/10 p-4">
            <p className="text-sm leading-6 text-zinc-100">
              Donate{" "}
              <span className={`font-extrabold ${getCurrencyClass(promotionPriceLabel)}`}>
                {promotionPriceLabel}
              </span>{" "}
              in world{" "}
              <span className="font-extrabold text-white">
                {promotionAssignedWorld || "Unknown"}
              </span>
              .
            </p>

            <p className="mt-2 text-sm text-zinc-200">
              Then click <span className="font-bold text-white">Confirm Donation</span>.
            </p>

            {minutesLeft !== null ? (
              <div className="mt-3 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-200">
                Time left: {minutesLeft} minute{minutesLeft === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleConfirmDonation}
            disabled={confirming}
            className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed"
          >
            {confirming ? "Confirming..." : "Confirm Donation"}
          </button>
        </div>
      ) : isPendingVerification ? (
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4 text-sm leading-6 text-zinc-100">
          Your donation has been confirmed by you and is now waiting for admin review.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {[3, 5, 7].map((days) => {
            const label =
              days === 3
                ? "70 DL"
                : days === 5
                ? "1 BGL"
                : "2 BGL";

            return (
              <button
                key={days}
                type="button"
                onClick={() => handlePromote(days)}
                disabled={loadingDays !== null}
                className={`rounded-2xl border p-4 text-left transition ${
                  loadingDays === days
                    ? "border-yellow-300/30 bg-yellow-500/20"
                    : "border-white/10 bg-black/20 hover:border-yellow-300/30 hover:bg-yellow-400/10"
                } disabled:cursor-not-allowed`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Promotion
                </p>

                <p className="mt-2 text-lg font-extrabold text-white">
                  {days} Days
                </p>

                <p className={`mt-1 text-sm font-extrabold ${getCurrencyClass(label)}`}>
                  {label}
                </p>

                <p className="mt-3 text-sm text-zinc-300">
                  {loadingDays === days ? "Requesting..." : "Activate promotion"}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {message ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-zinc-100">
          {message}
        </div>
      ) : null}
    </div>
  );
}