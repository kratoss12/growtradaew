import Link from "next/link";

export interface ItemCardProps {
  id: number;
  name: string;
  category: string;
  imageUrl: string | null;
  medianBuy: number | null;
  medianSell: number | null;
  totalListings: number;
  hasPromoted?: boolean;
  sellPreview?: string | null;
  buyPreview?: string | null;
  stockPreview?: number | null;
}

function formatMedian(value: number | null) {
  if (value == null) return "—";
  if (value < 1) return `${value.toFixed(4)} WL`;
  if (value % 1 === 0) return `${value} WL`;
  return `${value.toFixed(2)} WL`;
}

function getSpreadLabel(buy: number | null, sell: number | null) {
  if (buy == null || sell == null) return "—";
  const spread = sell - buy;
  if (spread === 0) return "0 WL";
  if (spread < 1 && spread > -1) return `${spread.toFixed(4)} WL`;
  if (spread % 1 === 0) return `${spread} WL`;
  return `${spread.toFixed(2)} WL`;
}

export function ItemCard({
  id,
  name,
  category,
  imageUrl,
  medianBuy,
  medianSell,
  totalListings,
  hasPromoted,
  sellPreview,
  buyPreview,
  stockPreview,
}: ItemCardProps) {
  const spreadLabel = getSpreadLabel(medianBuy, medianSell);

  return (
    <Link
      href={`/item/${id}`}
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${
        hasPromoted
          ? "border-yellow-400/30 bg-gradient-to-b from-yellow-400/15 via-yellow-400/5 to-black/20 hover:border-yellow-300/40 hover:shadow-yellow-400/10"
          : "border-white/10 bg-white/5 hover:border-emerald-300/20 hover:shadow-emerald-400/10"
      }`}
    >
      {hasPromoted ? (
        <div className="absolute right-3 top-3 z-10 rounded-full border border-yellow-300/30 bg-yellow-400 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-black">
          ★ Featured
        </div>
      ) : null}

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="h-11 w-11 object-contain transition-transform duration-200 group-hover:scale-110"
              />
            ) : (
              <span className="text-2xl">📦</span>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-8">
            <div className="mb-2 inline-flex rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
              {category}
            </div>

            <h3 className="line-clamp-2 text-lg font-extrabold text-white transition group-hover:text-emerald-300">
              {name}
            </h3>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/80">
              Buy
            </p>

            <p className="mt-1 text-sm font-extrabold text-emerald-300">
              {buyPreview || "—"}
            </p>

            <p className="mt-1 text-xs text-zinc-300">
              Median: {formatMedian(medianBuy)}
            </p>
          </div>

          <div className="rounded-2xl border border-red-400/15 bg-red-400/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-200/80">
              Sell
            </p>

            <p className="mt-1 text-sm font-extrabold text-red-300">
              {sellPreview || "—"}
            </p>

            <p className="mt-1 text-xs text-zinc-300">
              Median: {formatMedian(medianSell)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-white/10 bg-black/15 px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Listings
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {totalListings}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Spread
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {spreadLabel}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
          <span>Open item market →</span>
          {stockPreview ? <span>Top stock: {stockPreview}</span> : <span /> }
        </div>
      </div>
    </Link>
  );
}