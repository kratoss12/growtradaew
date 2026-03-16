import { createClient } from "../../../utils/supabase/server";
import PromoteListingButtons from "../../../components/promote-listing-buttons";

type Listing = {
  id: number;
  user_id: string;
  listing_type: "buy" | "sell";
  quantity: number;
  price_wl: number;
  world_name: string | null;
  created_at: string;
  status: string;
  expires_at: string | null;
  is_promoted: boolean;
  promotion_expires_at: string | null;
  promotion_payment_status: string | null;
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

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { id } = await params;

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select(`
      id,
      user_id,
      listing_type,
      quantity,
      price_wl,
      world_name,
      created_at,
      status,
      expires_at,
      is_promoted,
      promotion_expires_at,
      promotion_payment_status
    `)
    .eq("item_id", id)
    .eq("status", "approved")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const allListings = (listings || []) as Listing[];

  const sortPromotedFirst = (a: Listing, b: Listing) => {
    const aPromoted =
      a.is_promoted &&
      a.promotion_expires_at &&
      new Date(a.promotion_expires_at) > new Date();

    const bPromoted =
      b.is_promoted &&
      b.promotion_expires_at &&
      new Date(b.promotion_expires_at) > new Date();

    if (aPromoted && !bPromoted) return -1;
    if (!aPromoted && bPromoted) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  };

  const sellListings = allListings
    .filter((listing) => listing.listing_type === "sell")
    .sort(sortPromotedFirst);

  const buyListings = allListings
    .filter((listing) => listing.listing_type === "buy")
    .sort(sortPromotedFirst);

  const sellMedian = getMedian(sellListings.map((listing) => listing.price_wl));
  const buyMedian = getMedian(buyListings.map((listing) => listing.price_wl));

  if (itemError || !item) {
    return (
      <main style={{ padding: "40px" }}>
        <h1>Item not found</h1>
      </main>
    );
  }

  return (
    <main style={{ padding: "40px" }}>
      <a href="/marketplace" style={{ display: "inline-block", marginBottom: "20px" }}>
        ← Back to Marketplace
      </a>

      <h1>{item.name}</h1>
      <p>Category: {item.category}</p>

      {(listingsError || itemError) && <p>Error loading data.</p>}

      <div
        style={{
          marginTop: "20px",
          marginBottom: "24px",
          padding: "16px",
          border: "1px solid #ccc",
          borderRadius: "12px",
        }}
      >
        <p style={{ margin: "6px 0" }}>
          Median Sell Price: {sellMedian !== null ? `${sellMedian} WL` : "No sell listings"}
        </p>
        <p style={{ margin: "6px 0" }}>
          Median Buy Price: {buyMedian !== null ? `${buyMedian} WL` : "No buy listings"}
        </p>
        <p style={{ margin: "6px 0" }}>Total Sell Listings: {sellListings.length}</p>
        <p style={{ margin: "6px 0" }}>Total Buy Listings: {buyListings.length}</p>
      </div>

      <section style={{ marginBottom: "32px" }}>
        <h2>Sell Listings</h2>

        {sellListings.length === 0 ? (
          <p>No sell listings.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "12px" }}>
            {sellListings.map((listing) => {
              const isOwnedByUser = user?.id === listing.user_id;
              const isPromoted =
                listing.is_promoted &&
                listing.promotion_expires_at &&
                new Date(listing.promotion_expires_at) > new Date();

              return (
                <li
                  key={listing.id}
                  style={{
                    border: isPromoted ? "2px solid #ca8a04" : "1px solid #ccc",
                    borderRadius: "10px",
                    padding: "12px",
                    background: isPromoted ? "#fffbeb" : "transparent",
                  }}
                >
                  {isPromoted && (
                    <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#a16207" }}>
                      ★ PROMOTED
                    </p>
                  )}

                  <p style={{ margin: "4px 0" }}>Type: {listing.listing_type}</p>
                  <p style={{ margin: "4px 0" }}>Quantity: {listing.quantity}</p>
                  <p style={{ margin: "4px 0" }}>Price: {listing.price_wl} WL</p>
                  <p style={{ margin: "4px 0" }}>
                    World: {listing.world_name ? listing.world_name : "Not provided"}
                  </p>

                  {isOwnedByUser && (
                    <PromoteListingButtons listingId={listing.id} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Buy Listings</h2>

        {buyListings.length === 0 ? (
          <p>No buy listings.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "12px" }}>
            {buyListings.map((listing) => {
              const isOwnedByUser = user?.id === listing.user_id;
              const isPromoted =
                listing.is_promoted &&
                listing.promotion_expires_at &&
                new Date(listing.promotion_expires_at) > new Date();

              return (
                <li
                  key={listing.id}
                  style={{
                    border: isPromoted ? "2px solid #ca8a04" : "1px solid #ccc",
                    borderRadius: "10px",
                    padding: "12px",
                    background: isPromoted ? "#fffbeb" : "transparent",
                  }}
                >
                  {isPromoted && (
                    <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#a16207" }}>
                      ★ PROMOTED
                    </p>
                  )}

                  <p style={{ margin: "4px 0" }}>Type: {listing.listing_type}</p>
                  <p style={{ margin: "4px 0" }}>Quantity: {listing.quantity}</p>
                  <p style={{ margin: "4px 0" }}>Price: {listing.price_wl} WL</p>
                  <p style={{ margin: "4px 0" }}>
                    World: {listing.world_name ? listing.world_name : "Not provided"}
                  </p>

                  {isOwnedByUser && (
                    <PromoteListingButtons listingId={listing.id} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}