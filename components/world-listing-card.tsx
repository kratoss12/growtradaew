"use client";

import Link from "next/link";

type WorldListingCardProps = {
  id: number;
  worldName: string;
  description: string | null;
  priceLabel: string;
  createdAt: string;
  isPromoted: boolean;
  sellerName: string | null;
  sellerAvatarUrl: string | null;
  sellerDiscordUserId: string | null;
  sellerProfileId?: string;
};

export default function WorldListingCard({
  id,
  worldName,
  description,
  priceLabel,
  createdAt,
  isPromoted,
  sellerName,
  sellerAvatarUrl,
  sellerDiscordUserId,
  sellerProfileId,
}: WorldListingCardProps) {
  async function handleContactDiscord() {
    const fallbackName = sellerName || "Trader";

    try {
      await navigator.clipboard.writeText(fallbackName);
    } catch {}

    if (sellerDiscordUserId) {
      window.location.href = `discord://-/users/${sellerDiscordUserId}`;
      return;
    }

    alert(
      `Discord name copied if available: ${fallbackName}\nOpen Discord and search for the seller manually.`
    );
  }

  const displaySellerName = sellerName || "Trader";

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        isPromoted
          ? "border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-zinc-900"
          : "border-purple-500/30 bg-purple-500/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
            Sell World
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">{worldName}</h3>
        </div>

        {isPromoted ? (
          <span className="rounded-full bg-yellow-500 px-2 py-1 text-xs font-bold text-black">
            ★ Featured
          </span>
        ) : null}
      </div>

      <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-300">
        {description
          ? description.length > 140
            ? `${description.slice(0, 140)}...`
            : description
          : "No description."}
      </p>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Price</p>
        <p className="mt-1 text-lg font-bold text-white">{priceLabel}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
            {sellerAvatarUrl ? (
              <img
                src={sellerAvatarUrl}
                alt={displaySellerName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                {String(displaySellerName).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Seller
            </p>

            {sellerProfileId ? (
              <Link
                href={`/trader/${sellerProfileId}`}
                className="text-sm font-semibold text-white hover:text-purple-300"
              >
                {displaySellerName}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-white">
                {displaySellerName}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          {new Date(createdAt).toISOString().slice(0, 10)}
        </p>
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          href={`/world/${id}`}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
        >
          View Details
        </Link>

        <button
          type="button"
          onClick={handleContactDiscord}
          className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-400"
        >
          Contact Discord
        </button>
      </div>
    </div>
  );
}