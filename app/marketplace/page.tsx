import { supabase } from "../../lib/supabase";

type RawListing = {
  id: number;
  listing_type: "buy" | "sell";
  quantity: number;
  price_wl: number;
  world_name: string | null;
  created_at: string;
  item_id: number;
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
  quantity: number;
  price_wl: number;
  world_name: string | null;
  created_at: string;
  item_id: number;
};

type GroupedListing = {
  itemId: number;
  itemName: string;
  category: string;
  imageUrl: string | null;
  allListings: ListingItem[];
  visibleListings: ListingItem[];
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

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string }>;
}) {
  const params = await searchParams;

  const selectedType =
    params.type === "buy" || params.type === "sell" ? params.type : "all";

  const searchText = (params.search || "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      id,
      item_id,
      listing_type,
      quantity,
      price_wl,
      world_name,
      created_at,
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

  const groupedMap = new Map<string, GroupedListing>();

  for (const listing of rawListings) {
    const item = Array.isArray(listing.items) ? listing.items[0] : listing.items;
    if (!item) continue;

    if (!groupedMap.has(item.name)) {
      groupedMap.set(item.name, {
        itemId: listing.item_id,
        itemName: item.name,
        category: item.category,
        imageUrl: item.image_url,
        allListings: [],
        visibleListings: [],
      });
    }

    const listingData: ListingItem = {
      id: listing.id,
      listing_type: listing.listing_type,
      quantity: listing.quantity,
      price_wl: listing.price_wl,
      world_name: listing.world_name,
      created_at: listing.created_at,
      item_id: listing.item_id,
    };

    const group = groupedMap.get(item.name)!;
    group.allListings.push(listingData);

    if (selectedType === "all" || listing.listing_type === selectedType) {
      group.visibleListings.push(listingData);
    }
  }

  const groupedItems = Array.from(groupedMap.values())
    .filter((group) => group.visibleListings.length > 0)
    .filter((group) =>
      searchText === ""
        ? true
        : group.itemName.toLowerCase().includes(searchText)
    );

  return (
    <main style={{ padding: "40px" }}>
      <h1>Marketplace</h1>

      <form
        action="/marketplace"
        method="GET"
        style={{
          marginTop: "20px",
          marginBottom: "24px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input type="hidden" name="type" value={selectedType} />

        <input
          type="text"
          name="search"
          defaultValue={params.search || ""}
          placeholder="Search item name..."
          style={{
            padding: "10px 12px",
            minWidth: "240px",
            border: "1px solid #ccc",
            borderRadius: "10px",
          }}
        />

        <button
          type="submit"
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            cursor: "pointer",
            background: "white",
          }}
        >
          Search
        </button>

        <a
          href={`/marketplace?type=${selectedType}`}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Clear
        </a>
      </form>

      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <a
          href={`/marketplace?type=all`}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            textDecoration: "none",
            color: "inherit",
            fontWeight: selectedType === "all" ? "bold" : "normal",
          }}
        >
          All
        </a>

        <a
          href={`/marketplace?type=sell`}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            textDecoration: "none",
            color: "inherit",
            fontWeight: selectedType === "sell" ? "bold" : "normal",
          }}
        >
          Sell
        </a>

        <a
          href={`/marketplace?type=buy`}
          style={{
            padding: "10px 14px",
            border: "1px solid #ccc",
            borderRadius: "10px",
            textDecoration: "none",
            color: "inherit",
            fontWeight: selectedType === "buy" ? "bold" : "normal",
          }}
        >
          Buy
        </a>
      </div>

      {error && <p>Error loading listings: {error.message}</p>}

      {!groupedItems.length ? (
        <p>No listings found.</p>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {groupedItems.map((group) => {
            const sellPrices = group.allListings
              .filter((listing) => listing.listing_type === "sell")
              .map((listing) => listing.price_wl);

            const buyPrices = group.allListings
              .filter((listing) => listing.listing_type === "buy")
              .map((listing) => listing.price_wl);

            const sellMedian = getMedian(sellPrices);
            const buyMedian = getMedian(buyPrices);

            return (
              <section
                key={group.itemName}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "14px",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {group.imageUrl && (
                    <img
                      src={`/items/${group.imageUrl}`}
                      alt={group.itemName}
                      width={48}
                      height={48}
                      style={{
                        width: "48px",
                        height: "48px",
                        objectFit: "contain",
                        borderRadius: "8px",
                        border: "1px solid #e5e5e5",
                        padding: "4px",
                        background: "white",
                      }}
                    />
                  )}

                  <div>
                    <h2 style={{ margin: 0 }}>
                      <a
                        href={`/item/${group.itemId}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        {group.itemName}
                      </a>
                    </h2>

                    <p style={{ margin: "4px 0" }}>Category: {group.category}</p>
                  </div>
                </div>

                <div style={{ marginTop: "12px", marginBottom: "16px" }}>
                  <p>Median Sell Price: {sellMedian ?? "No sell listings"} WL</p>
                  <p>Median Buy Price: {buyMedian ?? "No buy listings"} WL</p>
                  <p>Visible Listings: {group.visibleListings.length}</p>
                  <p>Total Listings: {group.allListings.length}</p>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}