import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import PromoteListingButtons from "../../components/promote-listing-buttons";
import CancelListingButton from "../../components/cancel-listing-button";
import HighValueListingActions from "../../components/high-value-listing-actions";

type MyListing = {
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
  status: string;
  expires_at: string | null;
  created_at: string;
  assigned_world: string | null;
  payment_required_bgl: number | null;
  payment_status: string | null;
  is_promoted: boolean;
  promotion_expires_at: string | null;
  promotion_payment_status: string | null;
  promotion_payment_required_bgl: number | null;
  promotion_assigned_world: string | null;
  promotion_requested_at: string | null;
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

function getTimeLeft(expiresAt: string | null) {
  if (!expiresAt) return "No expiry";

  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function formatPromotionStatus(status: string | null) {
  switch (status) {
    case "awaiting_donation":
      return "Awaiting Donation";
    case "pending_verification":
      return "Pending Verification";
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

function formatPaymentStatus(status: string | null) {
  switch (status) {
    case "awaiting_donation":
      return "Awaiting Donation";
    case "pending_verification":
      return "Pending Verification";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

function formatListingPrice(listing: MyListing) {
  if (listing.pricing_mode === "per_wl") {
    return `${listing.price_amount ?? 0} per 1 WL`;
  }

  if (listing.price_amount && listing.price_currency) {
    return `${listing.price_amount} ${listing.price_currency} each`;
  }

  if (listing.price_wl < 1) return `${listing.price_wl.toFixed(4)} WL`;
  if (listing.price_wl % 1 === 0) return `${listing.price_wl} WL`;
  return `${listing.price_wl.toFixed(2)} WL`;
}

function formatWorldSalePrice(listing: MyListing) {
  if (listing.price_amount && listing.price_currency) {
    return `${listing.price_amount} ${listing.price_currency}`;
  }

  if (listing.price_wl < 1) return `${listing.price_wl.toFixed(4)} WL`;
  if (listing.price_wl % 1 === 0) return `${listing.price_wl} WL`;
  return `${listing.price_wl.toFixed(2)} WL`;
}

export default async function MyListingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: listings, error } = await supabase
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
      expires_at,
      created_at,
      assigned_world,
      payment_required_bgl,
      payment_status,
      is_promoted,
      promotion_expires_at,
      promotion_payment_status,
      promotion_payment_required_bgl,
      promotion_assigned_world,
      promotion_requested_at,
      items (
        name,
        category,
        image_url
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const myListings = (listings || []) as MyListing[];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="mt-2 text-zinc-200">
            Manage your active, expired, promoted, pending, and world listings.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-yellow-400/20 bg-yellow-400/10 p-5 backdrop-blur-sm">
          <p className="text-sm leading-6 text-zinc-100">
            <strong className="text-yellow-300">What promotion does:</strong>{" "}
            promoted listings appear above normal listings and stand out with a
            highlighted badge on the marketplace and item page, giving your
            listing more visibility.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            Error loading your listings: {error.message}
          </div>
        ) : null}

        {!myListings.length ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-zinc-200 backdrop-blur-sm">
            You have not created any listings yet.
          </div>
        ) : (
          <div className="grid gap-5">
            {myListings.map((listing) => {
              const item = Array.isArray(listing.items)
                ? listing.items[0]
                : listing.items;

              const promoted = isPromotionActive(listing);
              const expired =
                listing.expires_at !== null &&
                new Date(listing.expires_at) <= new Date();

              const nicePromotionStatus = formatPromotionStatus(
                listing.promotion_payment_status
              );

              const showHighValueActions =
                listing.payment_status === "awaiting_donation" ||
                listing.payment_status === "pending_verification";

              const isWorldListing = listing.listing_category === "world";
              const title = isWorldListing
                ? listing.world_sale_name || "Unknown World"
                : item?.name || "Unknown Item";

              const subtitle = isWorldListing
                ? "World Listing"
                : `Category: ${item?.category || "Unknown"}`;

              const displayPrice = isWorldListing
                ? formatWorldSalePrice(listing)
                : formatListingPrice(listing);

              const canEdit =
                !promoted &&
                listing.promotion_payment_status !== "awaiting_donation" &&
                listing.promotion_payment_status !== "pending_verification";

              return (
                <div
                  key={listing.id}
                  className={`rounded-3xl p-6 backdrop-blur-sm ${
                    promoted
                      ? "border-2 border-yellow-400/40 bg-yellow-400/10"
                      : isWorldListing
                      ? "border border-purple-400/25 bg-purple-400/10"
                      : "border border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex flex-wrap justify-between gap-5">
                    <div className="flex gap-4">
                      <div
                        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
                          isWorldListing ? "bg-purple-950/80" : "bg-black/20"
                        }`}
                      >
                        {isWorldListing ? (
                          <span className="text-2xl">🌍</span>
                        ) : item?.image_url ? (
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
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                              isWorldListing
                                ? "border border-purple-400/30 bg-purple-400/15 text-purple-300"
                                : listing.listing_type === "buy"
                                ? "border border-green-400/30 bg-green-400/15 text-green-300"
                                : "border border-red-400/30 bg-red-400/15 text-red-300"
                            }`}
                          >
                            {isWorldListing ? "sell world" : listing.listing_type}
                          </span>

                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                              listing.status === "approved"
                                ? "border border-green-400/30 bg-green-400/15 text-green-300"
                                : listing.status === "pending"
                                ? "border border-yellow-400/30 bg-yellow-400/15 text-yellow-300"
                                : "border border-white/10 bg-white/10 text-zinc-300"
                            }`}
                          >
                            {listing.status}
                          </span>

                          {promoted ? (
                            <span className="inline-flex items-center rounded-full border border-yellow-400/30 bg-yellow-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-yellow-300">
                              ★ Promoted
                            </span>
                          ) : null}

                          {expired ? (
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                              Expired
                            </span>
                          ) : null}
                        </div>

                        <h2 className="text-2xl font-extrabold text-white">{title}</h2>
                        <p className="mt-1 text-sm text-zinc-300">{subtitle}</p>
                      </div>
                    </div>

                    <div className="min-w-[160px] text-right">
                      <p className="text-3xl font-extrabold text-white">
                        {displayPrice}
                      </p>

                      {!isWorldListing && listing.quantity ? (
                        <p className="mt-1 text-sm text-zinc-300">×{listing.quantity}</p>
                      ) : null}

                      {!isWorldListing && listing.stock ? (
                        <p className="mt-1 text-sm text-zinc-300">
                          Stock: {listing.stock}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-4 text-sm text-zinc-300">
                    {isWorldListing ? (
                      <>
                        <span>Contact: Discord only</span>
                        <span>IGN: {listing.ingame_name || "Not provided"}</span>
                        <span>{getTimeLeft(listing.expires_at)}</span>
                        <span>
                          Created: {new Date(listing.created_at).toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>World: {listing.world_name || "Discord contact"}</span>
                        <span>IGN: {listing.ingame_name || "Not provided"}</span>
                        <span>{getTimeLeft(listing.expires_at)}</span>
                        <span>
                          Created: {new Date(listing.created_at).toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>

                  {isWorldListing && listing.world_sale_description ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-100">
                      {listing.world_sale_description}
                    </div>
                  ) : null}

                  {listing.payment_status &&
                  listing.payment_status !== "none" &&
                  listing.payment_status !== "verified" ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-100">
                      Listing verification status:{" "}
                      {formatPaymentStatus(listing.payment_status)}
                    </div>
                  ) : null}

                  {nicePromotionStatus ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-100">
                      Promotion status: {nicePromotionStatus}
                    </div>
                  ) : null}

                  {showHighValueActions ? (
                    <div className="mt-4">
                      <HighValueListingActions
                        listingId={listing.id}
                        paymentStatus={listing.payment_status}
                        assignedWorld={listing.assigned_world}
                        paymentRequiredBgl={listing.payment_required_bgl}
                        createdAt={listing.created_at}
                      />
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {canEdit ? (
                      <Link
                        href={`/edit-listing/${listing.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 font-bold text-white transition hover:bg-white/10"
                      >
                        Edit
                      </Link>
                    ) : null}

                    {listing.status === "approved" && !expired ? (
                      <div className="flex-[1_1_420px]">
                        <PromoteListingButtons
                          listingId={listing.id}
                          promotionPaymentStatus={listing.promotion_payment_status}
                          promotionAssignedWorld={listing.promotion_assigned_world}
                          promotionPaymentRequiredBgl={listing.promotion_payment_required_bgl}
                          promotionRequestedAt={listing.promotion_requested_at}
                        />
                      </div>
                    ) : null}

                    <CancelListingButton listingId={listing.id} />
                  </div>

                  {!isWorldListing && listing.item_id ? (
                    <div className="mt-4">
                      <Link
                        href={`/item/${listing.item_id}`}
                        className="text-sm font-semibold text-emerald-300 no-underline"
                      >
                        View item page →
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}