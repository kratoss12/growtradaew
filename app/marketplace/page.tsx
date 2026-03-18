import { createClient } from "../../utils/supabase/server";
import { ItemCard } from "../../components/item-card";
import { SectionHeader } from "../../components/section-header";
import WorldListingCard from "../../components/world-listing-card";

type RawListing = {
  id: number;
  user_id: string;
  listing_category: "item" | "world" | null;
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
  created_at: string;
  item_id: number | null;
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

type ListingItem = {
  id: number;
  listing_type: "buy" | "sell";
  quantity: number | null;
  price_wl: number;
  price_amount: number | null;
  price_currency: string | null;
  pricing_mode: "per_item" | "per_wl" | null;
  stock: number | null;
  world_name: string | null;
  created_at: string;
  item_id: number;
  is_promoted: boolean;
  promotion_expires_at: string | null;
};

type GroupedListing = {
  itemId: number;
  itemName: string;
  category: string;
  imageUrl: string | null;
  allListings: ListingItem[];
  visibleListings: ListingItem[];
  hasPromoted: boolean;
  cheapestSell: number | null;
  highestBuy: number | null;
  newestListingAt: string | null;
};

type SellerProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  discord_user_id: string | null;
};

function getMedian(numbers: number[]) {
  if (numbers.length === 0) return null;

  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

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

function getPreviewLabel(listings: ListingItem[], type: "buy" | "sell") {
  const match = listings.find((listing) => listing.listing_type === type);
  if (!match) return null;

  if (match.pricing_mode === "per_wl") {
    return `${match.price_amount ?? 0} per 1 WL`;
  }

  const amount = match.price_amount ?? match.price_wl;
  const currency = match.price_currency || "WL";
  return `${amount} ${currency} each`;
}

function getTopStock(listings: ListingItem[]) {
  const sellWithStock = listings.find(
    (listing) => listing.listing_type === "sell" && listing.stock && listing.stock > 0
  );

  return sellWithStock?.stock ?? null;
}

function formatWorldPrice(listing: RawListing) {
  if (listing.price_amount && listing.price_currency) {
    return `${listing.price_amount} ${listing.price_currency}`;
  }

  if (listing.price_wl < 1) return `${listing.price_wl.toFixed(4)} WL`;
  if (listing.price_wl % 1 === 0) return `${listing.price_wl} WL`;
  return `${listing.price_wl.toFixed(2)} WL`;
}

function getCheapestSell(listings: ListingItem[]) {
  const sells = listings
    .filter((listing) => listing.listing_type === "sell")
    .map((listing) => listing.price_wl);

  if (sells.length === 0) return null;
  return Math.min(...sells);
}

function getHighestBuy(listings: ListingItem[]) {
  const buys = listings
    .filter((listing) => listing.listing_type === "buy")
    .map((listing) => listing.price_wl);

  if (buys.length === 0) return null;
  return Math.max(...buys);
}

function getNewestListingAt(listings: ListingItem[]) {
  if (listings.length === 0) return null;

  return listings.reduce((latest, listing) => {
    if (!latest) return listing.created_at;
    return new Date(listing.created_at) > new Date(latest)
      ? listing.created_at
      : latest;
  }, null as string | null);
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    search?: string;
    sort?: string;
    stock?: string;
  }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const selectedType =
    params.type === "buy" ||
    params.type === "sell" ||
    params.type === "worlds"
      ? params.type
      : "all";

  const selectedSort =
    params.sort === "newest" ||
    params.sort === "name" ||
    params.sort === "most_listings" ||
    params.sort === "cheapest_sell" ||
    params.sort === "highest_buy"
      ? params.sort
      : "featured";

  const onlyWithStock = params.stock === "1";
  const searchText = (params.search || "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      user_id,
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
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const rawListings = (data || []) as RawListing[];

  const itemListings = rawListings.filter(
    (listing) => listing.listing_category === "item" || listing.listing_category === null
  );

  const worldListingsMap = new Map<number, RawListing>();
  for (const listing of rawListings) {
    if (listing.listing_category === "world") {
      worldListingsMap.set(listing.id, listing);
    }
  }
  const worldListings = Array.from(worldListingsMap.values());

  const worldSellerIds = Array.from(
    new Set(worldListings.map((listing) => listing.user_id).filter(Boolean))
  );

  let sellerProfileMap = new Map<string, SellerProfile>();

  if (worldSellerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, discord_user_id")
      .in("id", worldSellerIds);

    const rows = (profiles || []) as SellerProfile[];
    sellerProfileMap = new Map(rows.map((row) => [row.id, row]));
  }

  const groupedMap = new Map<string, GroupedListing>();

  for (const listing of itemListings) {
    const item = Array.isArray(listing.items) ? listing.items[0] : listing.items;
    if (!item || !listing.item_id) continue;

    if (!groupedMap.has(item.name)) {
      groupedMap.set(item.name, {
        itemId: listing.item_id,
        itemName: item.name,
        category: item.category,
        imageUrl: item.image_url,
        allListings: [],
        visibleListings: [],
        hasPromoted: false,
        cheapestSell: null,
        highestBuy: null,
        newestListingAt: null,
      });
    }

    const listingData: ListingItem = {
      id: listing.id,
      listing_type: listing.listing_type,
      quantity: listing.quantity,
      price_wl: listing.price_wl,
      price_amount: listing.price_amount,
      price_currency: listing.price_currency,
      pricing_mode: listing.pricing_mode,
      stock: listing.stock,
      world_name: listing.world_name,
      created_at: listing.created_at,
      item_id: listing.item_id,
      is_promoted: listing.is_promoted,
      promotion_expires_at: listing.promotion_expires_at,
    };

    const group = groupedMap.get(item.name)!;
    group.allListings.push(listingData);

    if (isPromotionActive(listingData)) {
      group.hasPromoted = true;
    }

    if (selectedType === "all" || listing.listing_type === selectedType) {
      group.visibleListings.push(listingData);
    }
  }

  const groupedItems = Array.from(groupedMap.values())
    .map((group) => ({
      ...group,
      cheapestSell: getCheapestSell(group.visibleListings),
      highestBuy: getHighestBuy(group.visibleListings),
      newestListingAt: getNewestListingAt(group.visibleListings),
    }))
    .filter((group) => group.visibleListings.length > 0)
    .filter((group) =>
      searchText === ""
        ? true
        : group.itemName.toLowerCase().includes(searchText)
    )
    .filter((group) => {
      if (!onlyWithStock) return true;
      return group.visibleListings.some(
        (listing) => listing.stock && listing.stock > 0
      );
    })
    .sort((a, b) => {
      if (selectedSort === "name") {
        return a.itemName.localeCompare(b.itemName);
      }

      if (selectedSort === "newest") {
        const aTime = a.newestListingAt ? new Date(a.newestListingAt).getTime() : 0;
        const bTime = b.newestListingAt ? new Date(b.newestListingAt).getTime() : 0;
        return bTime - aTime;
      }

      if (selectedSort === "most_listings") {
        return b.visibleListings.length - a.visibleListings.length;
      }

      if (selectedSort === "cheapest_sell") {
        if (a.cheapestSell == null && b.cheapestSell == null) return 0;
        if (a.cheapestSell == null) return 1;
        if (b.cheapestSell == null) return -1;
        return a.cheapestSell - b.cheapestSell;
      }

      if (selectedSort === "highest_buy") {
        if (a.highestBuy == null && b.highestBuy == null) return 0;
        if (a.highestBuy == null) return 1;
        if (b.highestBuy == null) return -1;
        return b.highestBuy - a.highestBuy;
      }

      if (a.hasPromoted && !b.hasPromoted) return -1;
      if (!a.hasPromoted && b.hasPromoted) return 1;

      return a.itemName.localeCompare(b.itemName);
    });

  const filteredWorldListings = worldListings
    .filter(
      (listing) =>
        selectedType === "all" ||
        selectedType === "sell" ||
        selectedType === "worlds"
    )
    .filter((listing) => {
      if (searchText === "") return true;

      return (
        (listing.world_sale_name || "").toLowerCase().includes(searchText) ||
        (listing.world_sale_description || "").toLowerCase().includes(searchText)
      );
    });

  const totalItemGroups = groupedItems.length;
  const totalWorlds = filteredWorldListings.length;
  const totalFeatured = groupedItems.filter((group) => group.hasPromoted).length;
  const totalWithStock = groupedItems.filter((group) =>
    group.visibleListings.some((listing) => listing.stock && listing.stock > 0)
  ).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          <SectionHeader
            title="Marketplace"
            description="Browse items, compare live prices, and discover world listings."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Item markets
              </p>
              <p className="mt-2 text-3xl font-extrabold text-white">
                {totalItemGroups}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                Featured items
              </p>
              <p className="mt-2 text-3xl font-extrabold text-white">
                {totalFeatured}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                With stock
              </p>
              <p className="mt-2 text-3xl font-extrabold text-white">
                {totalWithStock}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">
                World listings
              </p>
              <p className="mt-2 text-3xl font-extrabold text-white">
                {totalWorlds}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <form
              action="/marketplace"
              method="GET"
              className="flex w-full max-w-xl flex-col gap-3 sm:flex-row"
            >
              <input type="hidden" name="type" value={selectedType} />
              <input type="hidden" name="sort" value={selectedSort} />
              {onlyWithStock ? <input type="hidden" name="stock" value="1" /> : null}

              <input
                type="text"
                name="search"
                defaultValue={params.search || ""}
                placeholder="Search items or worlds..."
                className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none"
              />

              <button
                type="submit"
                className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300"
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <a
                href={`/marketplace?type=all${
                  searchText ? `&search=${encodeURIComponent(params.search || "")}` : ""
                }${selectedSort ? `&sort=${selectedSort}` : ""}${
                  onlyWithStock ? "&stock=1" : ""
                }`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedType === "all"
                    ? "border border-white/15 bg-white/15 text-white"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                All
              </a>

              <a
                href={`/marketplace?type=sell${
                  searchText ? `&search=${encodeURIComponent(params.search || "")}` : ""
                }${selectedSort ? `&sort=${selectedSort}` : ""}${
                  onlyWithStock ? "&stock=1" : ""
                }`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedType === "sell"
                    ? "border border-white/15 bg-white/15 text-white"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Sell
              </a>

              <a
                href={`/marketplace?type=buy${
                  searchText ? `&search=${encodeURIComponent(params.search || "")}` : ""
                }${selectedSort ? `&sort=${selectedSort}` : ""}${
                  onlyWithStock ? "&stock=1" : ""
                }`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedType === "buy"
                    ? "border border-white/15 bg-white/15 text-white"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Buy
              </a>

              <a
                href={`/marketplace?type=worlds${
                  searchText ? `&search=${encodeURIComponent(params.search || "")}` : ""
                }${selectedSort ? `&sort=${selectedSort}` : ""}${
                  onlyWithStock ? "&stock=1" : ""
                }`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedType === "worlds"
                    ? "border border-white/15 bg-white/15 text-white"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Worlds
              </a>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form action="/marketplace" method="GET" className="flex flex-wrap gap-2">
              <input type="hidden" name="type" value={selectedType} />
              {searchText ? <input type="hidden" name="search" value={params.search || ""} /> : null}
              {onlyWithStock ? <input type="hidden" name="stock" value="1" /> : null}

              <button
                type="submit"
                name="sort"
                value="featured"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedSort === "featured"
                    ? "border border-yellow-300/30 bg-yellow-400/15 text-yellow-200"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Featured
              </button>

              <button
                type="submit"
                name="sort"
                value="newest"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedSort === "newest"
                    ? "border border-white/15 bg-white/15 text-white"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Newest
              </button>

              <button
                type="submit"
                name="sort"
                value="name"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedSort === "name"
                    ? "border border-white/15 bg-white/15 text-white"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Name
              </button>

              <button
                type="submit"
                name="sort"
                value="most_listings"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedSort === "most_listings"
                    ? "border border-white/15 bg-white/15 text-white"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Most Listings
              </button>

              <button
                type="submit"
                name="sort"
                value="cheapest_sell"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedSort === "cheapest_sell"
                    ? "border border-red-300/30 bg-red-400/15 text-red-200"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Cheapest Sell
              </button>

              <button
                type="submit"
                name="sort"
                value="highest_buy"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  selectedSort === "highest_buy"
                    ? "border border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Highest Buy
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              <a
                href={`/marketplace?type=${selectedType}${
                  searchText ? `&search=${encodeURIComponent(params.search || "")}` : ""
                }${selectedSort ? `&sort=${selectedSort}` : ""}`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  !onlyWithStock
                    ? "border border-cyan-300/30 bg-cyan-400/15 text-cyan-200"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                All Stock States
              </a>

              <a
                href={`/marketplace?type=${selectedType}${
                  searchText ? `&search=${encodeURIComponent(params.search || "")}` : ""
                }${selectedSort ? `&sort=${selectedSort}` : ""}&stock=1`}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  onlyWithStock
                    ? "border border-cyan-300/30 bg-cyan-400/15 text-cyan-200"
                    : "border border-white/10 bg-black/20 text-zinc-300 hover:text-white"
                }`}
              >
                Only With Stock
              </a>

              <a
                href="/marketplace"
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:text-white"
              >
                Reset
              </a>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Error loading listings: {error.message}
          </p>
        )}

        {filteredWorldListings.length > 0 && (
          <div className="mt-10 rounded-3xl border border-purple-400/15 bg-purple-400/5 p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white">World Listings</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Worlds for sale with Discord contact.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredWorldListings.map((listing) => {
                const seller = sellerProfileMap.get(listing.user_id);

                return (
                  <WorldListingCard
  key={listing.id}
  id={listing.id}
  worldName={listing.world_sale_name || "Unknown World"}
  description={listing.world_sale_description}
  priceLabel={formatWorldPrice(listing)}
  createdAt={listing.created_at}
  isPromoted={isPromotionActive(listing)}
  sellerName={seller?.display_name || null}
  sellerAvatarUrl={seller?.avatar_url || null}
  sellerDiscordUserId={seller?.discord_user_id || null}
  sellerProfileId={listing.user_id}
/>
                );
              })}
            </div>
          </div>
        )}

        {selectedType !== "worlds" && (
          <>
            {!groupedItems.length ? (
              <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-sm">
                <p className="text-lg text-zinc-300">No item listings found.</p>
              </div>
            ) : (
              <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-5">
                  <h2 className="text-xl font-semibold text-white">Item Listings</h2>
                  <p className="mt-1 text-sm text-zinc-300">
                    Live grouped item prices from active players.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {groupedItems.map((group) => {
                    const sellPrices = group.allListings
                      .filter((listing) => listing.listing_type === "sell")
                      .map((listing) => listing.price_wl);

                    const buyPrices = group.allListings
                      .filter((listing) => listing.listing_type === "buy")
                      .map((listing) => listing.price_wl);

                    const sellMedian = getMedian(sellPrices);
                    const buyMedian = getMedian(buyPrices);

                    const sellPreview = getPreviewLabel(group.visibleListings, "sell");
                    const buyPreview = getPreviewLabel(group.visibleListings, "buy");
                    const topStock = getTopStock(group.visibleListings);

                    return (
                      <ItemCard
                        key={group.itemId}
                        id={group.itemId}
                        name={group.itemName}
                        category={group.category}
                        imageUrl={group.imageUrl}
                        medianBuy={buyMedian}
                        medianSell={sellMedian}
                        totalListings={group.visibleListings.length}
                        hasPromoted={group.hasPromoted}
                        sellPreview={sellPreview}
                        buyPreview={buyPreview}
                        stockPreview={topStock}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}