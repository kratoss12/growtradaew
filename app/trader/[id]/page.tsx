import Link from "next/link";
import { createClient } from "../../../utils/supabase/server";

type RawListing = {
  id: number;
  listing_category: "item" | "world" | null;
  item_id: number | null;
  listing_type: "buy" | "sell";
  quantity: number | null;
  price_wl: number;
  price_amount: number | null;
  price_currency: string | null;
  pricing_mode: "per_item" | "per_wl" | null;
  stock: number | null;
  world_name: string | null;
  world_sale_name: string | null;
  world_sale_description: string | null;
  ingame_name: string | null;
  created_at: string;
  expires_at: string | null;
  is_promoted: boolean;
  promotion_expires_at: string | null;
  items:
    | {
        name: string;
        category: string;
        image_url: string | null;
      }
    | {
        name: string;
        category: string;
        image_url: string | null;
      }[]
    | null;
};

function isPromotionActive(listing: {
  is_promoted: boolean;
  promotion_expires_at: string | null;
}) {
  return (
    listing.is_promoted &&
    !!listing.promotion_expires_at &&
    new Date(listing.promotion_expires_at) > new Date()
  );
}

function formatListingPrice(listing: RawListing) {
  if (listing.pricing_mode === "per_wl") {
    return `${listing.price_amount ?? 0} per 1 WL`;
  }

  if (listing.price_amount && listing.price_currency) {
    if (listing.listing_category === "world") {
      return `${listing.price_amount} ${listing.price_currency}`;
    }
    return `${listing.price_amount} ${listing.price_currency} each`;
  }

  if (listing.price_wl < 1) return `${listing.price_wl.toFixed(4)} WL`;
  if (listing.price_wl % 1 === 0) return `${listing.price_wl} WL`;
  return `${listing.price_wl.toFixed(2)} WL`;
}

export default async function TraderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, discord_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold">Trader not found</h1>
        </div>
      </main>
    );
  }

  const { data: listings } = await supabase
    .from("listings")
    .select(`
      id,
      listing_category,
      item_id,
      listing_type,
      quantity,
      price_wl,
      price_amount,
      price_currency,
      pricing_mode,
      stock,
      world_name,
      world_sale_name,
      world_sale_description,
      ingame_name,
      created_at,
      expires_at,
      is_promoted,
      promotion_expires_at,
      items (
        name,
        category,
        image_url
      )
    `)
    .eq("user_id", id)
    .eq("status", "approved")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const activeListings = (listings || []) as RawListing[];

  const itemListings = activeListings.filter(
    (listing) => listing.listing_category === "item" || listing.listing_category === null
  );

  const worldListings = activeListings.filter(
    (listing) => listing.listing_category === "world"
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/marketplace"
          className="inline-flex items-center text-sm font-medium text-zinc-300 transition hover:text-white"
        >
          ← Back to Marketplace
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-5">
            <div className="h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-black/20">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || "Trader"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                  {String(profile.display_name || "T").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-[240px]">
              <div className="mb-3 inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                Trader Profile
              </div>

              <h1 className="text-4xl font-extrabold text-white">
                {profile.display_name || "Trader"}
              </h1>

              <p className="mt-2 text-zinc-200">
                Active marketplace listings from this trader.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Active item listings
              </p>
              <p className="mt-2 text-3xl font-extrabold text-white">
                {itemListings.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Active world listings
              </p>
              <p className="mt-2 text-3xl font-extrabold text-white">
                {worldListings.length}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Total active listings
              </p>
              <p className="mt-2 text-3xl font-extrabold text-white">
                {activeListings.length}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-extrabold text-white">Item Listings</h2>
          <p className="mt-1 text-sm text-zinc-300">
            Current buy and sell listings from this trader.
          </p>

          {itemListings.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-zinc-300">
              No active item listings.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {itemListings.map((listing) => {
                const item = Array.isArray(listing.items)
                  ? listing.items[0]
                  : listing.items;

                return (
                  <div
                    key={listing.id}
                    className={`rounded-3xl border p-5 ${
                      isPromotionActive(listing)
                        ? "border-yellow-400/25 bg-yellow-400/10"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                          {item?.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item?.name || "Item"}
                              className="h-10 w-10 object-contain"
                            />
                          ) : (
                            <span className="text-2xl">📦</span>
                          )}
                        </div>

                        <div>
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                listing.listing_type === "buy"
                                  ? "bg-emerald-400/15 text-emerald-200"
                                  : "bg-red-400/15 text-red-200"
                              }`}
                            >
                              {listing.listing_type}
                            </span>

                            {isPromotionActive(listing) ? (
                              <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
                                Featured
                              </span>
                            ) : null}
                          </div>

                          <h3 className="text-xl font-bold text-white">
                            {item?.name || "Unknown Item"}
                          </h3>

                          <p className="mt-1 text-sm text-zinc-300">
                            {item?.category || "Unknown"}
                          </p>

                          <p className="mt-2 text-sm text-zinc-300">
                            IGN: {listing.ingame_name || "Not provided"}
                          </p>

                          <p className="mt-1 text-sm text-zinc-300">
                            {listing.price_wl > 20000
                              ? "Discord contact"
                              : `World: ${listing.world_name || "Not provided"}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-white">
                          {formatListingPrice(listing)}
                        </p>

                        {listing.quantity ? (
                          <p className="mt-1 text-sm text-zinc-300">
                            Qty: {listing.quantity}
                          </p>
                        ) : null}

                        {listing.stock ? (
                          <p className="mt-1 text-sm text-zinc-300">
                            Stock: {listing.stock}
                          </p>
                        ) : null}

                        {listing.item_id ? (
                          <Link
                            href={`/item/${listing.item_id}`}
                            className="mt-3 inline-block text-sm font-semibold text-emerald-300 hover:text-emerald-200"
                          >
                            Open item page →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="text-2xl font-extrabold text-white">World Listings</h2>
          <p className="mt-1 text-sm text-zinc-300">
            Active worlds being sold by this trader.
          </p>

          {worldListings.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-zinc-300">
              No active world listings.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {worldListings.map((listing) => (
                <div
                  key={listing.id}
                  className={`rounded-3xl border p-5 ${
                    isPromotionActive(listing)
                      ? "border-yellow-400/25 bg-yellow-400/10"
                      : "border-purple-400/20 bg-purple-400/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                        Sell World
                      </p>
                      <h3 className="mt-1 text-xl font-bold text-white">
                        {listing.world_sale_name || "Unknown World"}
                      </h3>
                    </div>

                    {isPromotionActive(listing) ? (
                      <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
                        Featured
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-4 text-lg font-extrabold text-white">
                    {formatListingPrice(listing)}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    {listing.world_sale_description || "No description."}
                  </p>

                  <p className="mt-3 text-sm text-zinc-300">
                    IGN: {listing.ingame_name || "Not provided"}
                  </p>

                  <Link
                    href={`/world/${listing.id}`}
                    className="mt-4 inline-block text-sm font-semibold text-purple-300 hover:text-purple-200"
                  >
                    View world page →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}