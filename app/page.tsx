import Link from "next/link";
import { createClient } from "../utils/supabase/server";

type RawListing = {
  id: number;
  item_id: number | null;
  listing_type: "buy" | "sell";
  created_at: string;
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

type TrendingItem = {
  itemId: number;
  name: string;
  category: string;
  imageUrl: string | null;
  totalListings: number;
  buyCount: number;
  sellCount: number;
  hasPromoted: boolean;
  newestAt: string;
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

export default async function Home() {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("listings")
    .select(`
      id,
      item_id,
      listing_type,
      created_at,
      is_promoted,
      promotion_expires_at,
      items (
        name,
        category,
        image_url
      )
    `)
    .eq("status", "approved")
    .eq("listing_category", "item")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  const rawListings = (listings || []) as RawListing[];

  const groupedMap = new Map<number, TrendingItem>();

  for (const listing of rawListings) {
    if (!listing.item_id) continue;

    const item = Array.isArray(listing.items) ? listing.items[0] : listing.items;
    if (!item) continue;

    if (!groupedMap.has(listing.item_id)) {
      groupedMap.set(listing.item_id, {
        itemId: listing.item_id,
        name: item.name,
        category: item.category,
        imageUrl: item.image_url,
        totalListings: 0,
        buyCount: 0,
        sellCount: 0,
        hasPromoted: false,
        newestAt: listing.created_at,
      });
    }

    const group = groupedMap.get(listing.item_id)!;
    group.totalListings += 1;

    if (listing.listing_type === "buy") {
      group.buyCount += 1;
    } else {
      group.sellCount += 1;
    }

    if (isPromotionActive(listing)) {
      group.hasPromoted = true;
    }

    if (new Date(listing.created_at) > new Date(group.newestAt)) {
      group.newestAt = listing.created_at;
    }
  }

  const trendingItems = Array.from(groupedMap.values())
    .sort((a, b) => {
      if (a.hasPromoted && !b.hasPromoted) return -1;
      if (!a.hasPromoted && b.hasPromoted) return 1;
      if (b.totalListings !== a.totalListings) return b.totalListings - a.totalListings;
      return new Date(b.newestAt).getTime() - new Date(a.newestAt).getTime();
    })
    .slice(0, 6);

  const totalLiveListings = rawListings.length;
  const totalTrackedItems = groupedMap.size;
  const totalFeatured = trendingItems.filter((item) => item.hasPromoted).length;

  return (
    <main className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <p className="mb-4 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">
            Growtopia Economy Tracker
          </p>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight sm:text-6xl lg:text-7xl">
            Trade Growtopia Items
            <span className="block bg-gradient-to-r from-yellow-300 via-green-300 to-cyan-300 bg-clip-text text-transparent">
              Smarter, Faster, Safer
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg text-zinc-200">
            Track item prices, find the best deals, compare buy and sell listings,
            and trade using real player data from the marketplace.
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/marketplace"
              className="rounded-xl bg-emerald-400 px-8 py-3 font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
            >
              Browse Marketplace
            </Link>

            <Link
              href="/post"
              className="rounded-xl border border-white/15 bg-white/10 px-8 py-3 font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              Create Listing
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-left backdrop-blur-sm">
            <p className="text-sm font-semibold text-emerald-300">
              Live Listings
            </p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {totalLiveListings}
            </p>
            <p className="mt-2 text-sm text-zinc-200">
              Active item listings currently live on the marketplace.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-left backdrop-blur-sm">
            <p className="text-sm font-semibold text-yellow-300">
              Tracked Markets
            </p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {totalTrackedItems}
            </p>
            <p className="mt-2 text-sm text-zinc-200">
              Item markets with real buy and sell activity.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-left backdrop-blur-sm">
            <p className="text-sm font-semibold text-cyan-300">
              Featured Activity
            </p>
            <p className="mt-2 text-3xl font-extrabold text-white">
              {totalFeatured}
            </p>
            <p className="mt-2 text-sm text-zinc-200">
              Hot promoted items getting extra visibility.
            </p>
          </div>
        </div>

        <section className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-yellow-300/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-yellow-200">
                Trending Now
              </p>
              <h2 className="text-3xl font-extrabold text-white">
                Hot item markets
              </h2>
              <p className="mt-2 text-zinc-200">
                Most active items based on live listings and recent marketplace activity.
              </p>
            </div>

            <Link
              href="/marketplace"
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              View all markets
            </Link>
          </div>

          {trendingItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-zinc-300">
              No trending items yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {trendingItems.map((item) => (
                <Link
                  key={item.itemId}
                  href={`/item/${item.itemId}`}
                  className={`group rounded-3xl border p-5 transition hover:-translate-y-1 ${
                    item.hasPromoted
                      ? "border-yellow-400/25 bg-gradient-to-br from-yellow-400/10 via-white/5 to-black/20 hover:border-yellow-300/35"
                      : "border-white/10 bg-black/20 hover:border-emerald-300/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-11 w-11 object-contain transition duration-200 group-hover:scale-110"
                          />
                        ) : (
                          <span className="text-2xl">📦</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="mb-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">
                          {item.category}
                        </p>

                        <h3 className="line-clamp-2 text-xl font-extrabold text-white group-hover:text-emerald-300">
                          {item.name}
                        </h3>
                      </div>
                    </div>

                    {item.hasPromoted ? (
                      <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-black">
                        Hot
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                        Listings
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-white">
                        {item.totalListings}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/80">
                        Buy
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-emerald-300">
                        {item.buyCount}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-red-300/15 bg-red-400/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-red-200/80">
                        Sell
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-red-300">
                        {item.sellCount}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm font-semibold text-zinc-300">
                    Open market →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}