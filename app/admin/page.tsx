import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import AdminListingActions from "../../components/admin-listing-actions";
import AdminItemRequestActions from "../../components/admin-item-request-actions";
import AdminRunPriceSnapshot from "../../components/admin-run-price-snapshot";

type ItemRequest = {
  id: number;
  requested_name: string;
  normalized_name: string;
  status: string;
  created_at: string;
  review_notes: string | null;
  suggested_category: string | null;
  suggested_image_url: string | null;
  requested_by_user_id: string;
};

type RequestUserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type ItemRow = {
  id: number;
  name: string;
  normalized_name: string;
  category: string | null;
  image_url: string | null;
  is_official: boolean;
  needs_review: boolean;
};

type ListingCountRow = {
  item_id: number;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    redirect("/");
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
      status,
      created_at,
      assigned_world,
      payment_required_bgl,
      payment_status,
      promotion_payment_status,
      promotion_payment_required_bgl,
      promotion_assigned_world,
      items (
        name,
        category,
        image_url
      )
    `)
    .or(
      "status.eq.pending,payment_status.eq.awaiting_donation,payment_status.eq.pending_verification,promotion_payment_status.eq.awaiting_donation,promotion_payment_status.eq.pending_verification"
    )
    .order("created_at", { ascending: false });

  const { data: itemRequests } = await supabase
    .from("item_requests")
    .select(`
      id,
      requested_name,
      normalized_name,
      status,
      created_at,
      review_notes,
      suggested_category,
      suggested_image_url,
      requested_by_user_id
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const requestRows = (itemRequests || []) as ItemRequest[];

  const requestUserIds = Array.from(
    new Set(requestRows.map((row) => row.requested_by_user_id).filter(Boolean))
  );

  let requestUserMap = new Map<string, RequestUserProfile>();

  if (requestUserIds.length > 0) {
    const { data: requestProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", requestUserIds);

    const rows = (requestProfiles || []) as RequestUserProfile[];
    requestUserMap = new Map(rows.map((row) => [row.id, row]));
  }

  const normalizedNames = Array.from(
    new Set(requestRows.map((row) => row.normalized_name).filter(Boolean))
  );

  let itemByNormalizedName = new Map<string, ItemRow>();
  let listingCountByItemId = new Map<number, number>();

  if (normalizedNames.length > 0) {
    const { data: matchingItems } = await supabase
      .from("items")
      .select(`
        id,
        name,
        normalized_name,
        category,
        image_url,
        is_official,
        needs_review
      `)
      .in("normalized_name", normalizedNames);

    const itemRows = (matchingItems || []) as ItemRow[];
    itemByNormalizedName = new Map(
      itemRows.map((item) => [item.normalized_name, item])
    );

    const itemIds = itemRows.map((item) => item.id);

    if (itemIds.length > 0) {
      const { data: relatedListings } = await supabase
        .from("listings")
        .select("item_id")
        .in("item_id", itemIds);

      const countRows = (relatedListings || []) as ListingCountRow[];

      for (const row of countRows) {
        const current = listingCountByItemId.get(row.item_id) || 0;
        listingCountByItemId.set(row.item_id, current + 1);
      }
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h1 className="text-3xl font-extrabold">Admin Panel</h1>
          <p className="mt-2 text-zinc-200">
            Review pending listings, promotion requests, missing item requests, and market data tools.
          </p>
        </div>

        <div className="mb-10">
          <AdminRunPriceSnapshot />
        </div>

        <section className="mb-10 rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-6 backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white">New Item Requests</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Review requested items before they become official marketplace items.
            </p>
          </div>

          {!requestRows.length ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-zinc-300">
              No pending item requests.
            </div>
          ) : (
            <div className="grid gap-5">
              {requestRows.map((request) => {
                const requester = requestUserMap.get(request.requested_by_user_id);
                const linkedItem = itemByNormalizedName.get(request.normalized_name);
                const listingCount = linkedItem
                  ? listingCountByItemId.get(linkedItem.id) || 0
                  : 0;

                return (
                  <div
                    key={request.id}
                    className="rounded-3xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-[280px] flex-1">
                        <div className="mb-2 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
                          Pending Item Request
                        </div>

                        <h3 className="text-2xl font-extrabold text-white">
                          {request.requested_name}
                        </h3>

                        <p className="mt-2 text-sm text-zinc-300">
                          Normalized:{" "}
                          <span className="font-medium text-white">
                            {request.normalized_name}
                          </span>
                        </p>

                        <p className="mt-1 text-sm text-zinc-300">
                          Requested on {new Date(request.created_at).toLocaleString()}
                        </p>

                        {linkedItem ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-4">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs uppercase tracking-wider text-zinc-400">
                                Item ID
                              </p>
                              <p className="mt-2 text-lg font-bold text-white">
                                {linkedItem.id}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs uppercase tracking-wider text-zinc-400">
                                Listings
                              </p>
                              <p className="mt-2 text-lg font-bold text-white">
                                {listingCount}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs uppercase tracking-wider text-zinc-400">
                                Status
                              </p>
                              <p className="mt-2 text-sm font-bold text-white">
                                {linkedItem.is_official ? "Official" : "Temporary"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <p className="text-xs uppercase tracking-wider text-zinc-400">
                                Image
                              </p>
                              <p className="mt-2 text-sm font-bold text-white">
                                {linkedItem.image_url ? "Added" : "Missing"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                            No linked temporary item was found yet for this request.
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                          {requester?.avatar_url ? (
                            <img
                              src={requester.avatar_url}
                              alt={requester.display_name || "Requester"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                              {String(requester?.display_name || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-zinc-400">
                            Requested by
                          </p>
                          <p className="text-sm font-semibold text-white">
                            {requester?.display_name || "Unknown User"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <AdminItemRequestActions
                      requestId={request.id}
                      requestedName={request.requested_name}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white">Pending Listings</h2>
            <p className="mt-1 text-sm text-zinc-300">
              Review high-value listings, pending listings, and promotion requests.
            </p>
          </div>

          {!listings?.length ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-zinc-300">
              No pending listings.
            </div>
          ) : (
            <div className="grid gap-4">
              {listings.map((listing: any) => {
                const item = Array.isArray(listing.items)
                  ? listing.items[0]
                  : listing.items;

                const isWorld = listing.listing_category === "world";

                const displayTitle = isWorld
                  ? listing.world_sale_name || "Unknown World"
                  : item?.name || "Unknown Item";

                const displayCategory = isWorld
                  ? "World Listing"
                  : item?.category || "Unknown";

                const displayPrice =
                  listing.price_amount && listing.price_currency
                    ? `${listing.price_amount} ${listing.price_currency}`
                    : `${listing.price_wl} WL`;

                return (
                  <div
                    key={listing.id}
                    className={`rounded-3xl p-5 ${
                      isWorld
                        ? "border border-purple-400/25 bg-purple-400/10"
                        : "border border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="flex flex-wrap justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold">{displayTitle}</h2>

                        <p className="mt-1 text-sm text-zinc-300">
                          {displayCategory}
                        </p>

                        <p className="mt-2">
                          <strong>Type:</strong>{" "}
                          {isWorld ? "sell world" : listing.listing_type}
                        </p>

                        <p>
                          <strong>Price:</strong> {displayPrice}
                        </p>

                        {!isWorld && (
                          <>
                            <p>
                              <strong>Quantity:</strong> {listing.quantity || "N/A"}
                            </p>

                            <p>
                              <strong>Stock:</strong> {listing.stock || "N/A"}
                            </p>
                          </>
                        )}

                        <p>
                          <strong>IGN:</strong> {listing.ingame_name || "Not provided"}
                        </p>

                        {!isWorld && (
                          <p>
                            <strong>World:</strong>{" "}
                            {listing.world_name || "Discord contact"}
                          </p>
                        )}

                        {isWorld && (
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-200">
                            {listing.world_sale_description}
                          </p>
                        )}
                      </div>

                      <div className="text-sm text-zinc-300">
                        <p>
                          <strong>Status:</strong> {listing.status}
                        </p>

                        {listing.payment_status && (
                          <p>
                            <strong>Payment:</strong> {listing.payment_status}
                          </p>
                        )}

                        {listing.promotion_payment_status && (
                          <p>
                            <strong>Promotion:</strong>{" "}
                            {listing.promotion_payment_status}
                          </p>
                        )}

                        {listing.assigned_world && (
                          <p>
                            <strong>Donation World:</strong> {listing.assigned_world}
                          </p>
                        )}

                        {listing.promotion_assigned_world && (
                          <p>
                            <strong>Promotion World:</strong>{" "}
                            {listing.promotion_assigned_world}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <AdminListingActions
                        listingId={listing.id}
                        promotionPaymentStatus={listing.promotion_payment_status}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}