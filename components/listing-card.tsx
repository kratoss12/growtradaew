"use client";

import Link from "next/link";

export interface ListingCardProps {
  listingType: "buy" | "sell";
  quantity: number | null;
  priceWl: number;
  priceAmount?: number | null;
  priceCurrency?: string | null;
  pricingMode?: "per_item" | "per_wl" | null;
  stock?: number | null;
  worldName: string;
  ingameName?: string;
  discordAvatar?: string;
  discordUserId?: string;
  displayName?: string;
  sellerProfileId?: string;
  isPromoted?: boolean;
  expiresAt: string;
  children?: React.ReactNode;
}

function getCurrencyClasses(currency?: string | null) {
  if (currency === "WL") {
    return "text-yellow-300";
  }

  if (currency === "DL") {
    return "text-sky-300";
  }

  if (currency === "BGL") {
    return "text-blue-400";
  }

  return "text-white";
}

function formatMainPriceParts(
  pricingMode?: "per_item" | "per_wl" | null,
  priceAmount?: number | null,
  priceCurrency?: string | null,
  priceWl?: number
) {
  if (pricingMode === "per_wl") {
    return {
      amount: `${priceAmount ?? 0}`,
      currency: "ITEMS",
      suffix: "per 1 WL",
      currencyClass: "text-emerald-300",
    };
  }

  if (pricingMode === "per_item") {
    return {
      amount: `${priceAmount ?? 0}`,
      currency: priceCurrency || "WL",
      suffix: "each",
      currencyClass: getCurrencyClasses(priceCurrency || "WL"),
    };
  }

  return {
    amount: `${priceWl ?? 0}`,
    currency: "WL",
    suffix: "",
    currencyClass: "text-yellow-300",
  };
}

function formatMedianWl(value: number) {
  if (value < 1) return `${value.toFixed(4)} WL`;
  if (value % 1 === 0) return `${value} WL`;
  return `${value.toFixed(2)} WL`;
}

function getTimeLeft(expiresAt: string): string {
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export function ListingCard({
  listingType,
  quantity,
  priceWl,
  priceAmount,
  priceCurrency,
  pricingMode,
  stock,
  worldName,
  ingameName,
  discordAvatar,
  discordUserId,
  displayName,
  sellerProfileId,
  isPromoted,
  expiresAt,
  children,
}: ListingCardProps) {
  const isHighValue = priceWl > 20000;
  const timeLeft = getTimeLeft(expiresAt);
  const traderName = displayName || ingameName || "Unknown";
  const priceParts = formatMainPriceParts(
    pricingMode,
    priceAmount,
    priceCurrency,
    priceWl
  );

  async function handleDiscordContact() {
    const fallbackName = traderName;

    try {
      await navigator.clipboard.writeText(fallbackName);
    } catch {}

    if (discordUserId) {
      window.location.href = `discord://-/users/${discordUserId}`;
      return;
    }

    alert(
      `Discord name copied if available: ${fallbackName}\nOpen Discord and search for the trader manually.`
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-3xl border shadow-[0_20px_60px_rgba(0,0,0,0.25)] ${
        isPromoted
          ? "border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 via-zinc-900/95 to-zinc-950"
          : "border-white/10 bg-gradient-to-br from-white/10 via-zinc-900/95 to-zinc-950"
      }`}
    >
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] ${
                  listingType === "buy"
                    ? "border border-emerald-300/20 bg-emerald-400/15 text-emerald-300"
                    : "border border-red-300/20 bg-red-400/15 text-red-300"
                }`}
              >
                {listingType}
              </span>

              {isPromoted ? (
                <span className="rounded-full border border-yellow-300/30 bg-yellow-400 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-black">
                  ★ Promoted
                </span>
              ) : null}

              {stock ? (
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
                  Stock {stock}
                </span>
              ) : null}

              {quantity ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-200">
                  Qty {quantity}
                </span>
              ) : null}
            </div>

            {!isHighValue ? (
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/80">
                  Buy in world
                </p>
                <p className="mt-2 text-3xl font-extrabold tracking-wide text-white">
                  {worldName}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200/80">
                  High-value trade
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  This trade is above vending range. Contact the seller directly on Discord.
                </p>

                <button
                  type="button"
                  onClick={handleDiscordContact}
                  className="mt-4 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-indigo-400"
                >
                  Contact on Discord
                </button>
              </div>
            )}
          </div>

          <div className="w-full md:w-auto md:min-w-[270px]">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4 md:text-right">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                Price
              </p>

              <div className="mt-2 flex flex-wrap items-end gap-2 md:justify-end">
                <span className="text-4xl font-extrabold leading-none text-white">
                  {priceParts.amount}
                </span>

                <span
                  className={`text-2xl font-extrabold leading-none ${priceParts.currencyClass}`}
                >
                  {priceParts.currency}
                </span>
              </div>

              {priceParts.suffix ? (
                <p className="mt-2 text-sm font-semibold text-zinc-300">
                  {priceParts.suffix}
                </p>
              ) : null}

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                  WL median
                </p>
                <p className="mt-1 text-sm font-bold text-white">
                  {formatMedianWl(priceWl)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800">
              {discordAvatar ? (
                <img
                  src={discordAvatar}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-extrabold text-white">
                  {String(traderName).charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Trader
              </p>

              {sellerProfileId ? (
                <Link
                  href={`/trader/${sellerProfileId}`}
                  className="truncate text-sm font-extrabold text-white hover:text-emerald-300"
                >
                  {traderName}
                </Link>
              ) : (
                <p className="truncate text-sm font-extrabold text-white">
                  {traderName}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200">
            {timeLeft}
          </div>
        </div>

        {children ? (
          <div className="mt-5 rounded-2xl border border-yellow-300/15 bg-yellow-400/5 p-4">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}