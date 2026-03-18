import Link from "next/link";
import { createClient } from "../../../utils/supabase/server";
import PromoteListingButtons from "../../../components/promote-listing-buttons";
import { ListingCard } from "../../../components/listing-card";
import BuyListingComments from "../../../components/buy-listing-comments";
import ItemPriceChart from "../../../components/item-price-chart";

type Listing = {
  id: number;
  user_id: string;
  listing_type: "buy" | "sell";
  quantity: number | null;
  price_wl: number;
  price_amount: number | null;
  price_currency: string | null;
  pricing_mode: "per_item" | "per_wl" | null;
  stock: number | null;
  world_name: string | null;
  ingame_name: string | null;
  created_at: string;
  status: string;
  expires_at: string | null;
  is_promoted: boolean;
  promotion_expires_at: string | null;
  promotion_payment_status: string | null;
  promotion_payment_required_bgl: number | null;
  promotion_assigned_world: string | null;
  promotion_requested_at: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  discord_user_id: string | null;
};

type RawComment = {
  id: number;
  listing_id: number;
  comment_text: string;
  created_at: string;
  user_id: string;
};

type CommentView = {
  id: number;
  listing_id: number;
  comment_text: string;
  created_at: string;
  user_display_name: string | null;
  user_avatar_url: string | null;
  is_owner: boolean;
};

type PriceHistoryRow = {
  snapshot_date: string;
  median_buy_wl: number | null;
  median_sell_wl: number | null;
};

function getMedian(numbers: number[]) {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2;
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

function formatMedianWl(value: number | null) {
  if (value == null) return "—";
  if (value < 1) return `${value.toFixed(4)} WL`;
  if (value % 1 === 0) return `${value} WL`;
  return `${value.toFixed(2)} WL`;
}

function getRepresentativeLabel(listings: Listing[]) {
  if (!listings.length) return "—";

  const perWl = listings.find((l) => l.pricing_mode === "per_wl");
  if (perWl) return `${perWl.price_amount ?? 0} per 1 WL`;

  const perItem = listings.find((l) => l.pricing_mode === "per_item");
  if (perItem) return `${perItem.price_amount ?? 0} ${perItem.price_currency || "WL"} each`;

  const median = getMedian(listings.map((l) => l.price_wl));
  return formatMedianWl(median);
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
      price_amount,
      price_currency,
      pricing_mode,
      stock,
      world_name,
      ingame_name,
      created_at,
      status,
      expires_at,
      is_promoted,
      promotion_expires_at,
      promotion_payment_status,
      promotion_payment_required_bgl,
      promotion_assigned_world,
      promotion_requested_at
    `)
    .eq("item_id", id)
    .eq("status", "approved")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  const { data: priceHistory } = await supabase
    .from("item_price_history")
    .select("snapshot_date, median_buy_wl, median_sell_wl")
    .eq("item_id", id)
    .order("snapshot_date", { ascending: true })
    .limit(30);

  const chartData =
    ((priceHistory || []) as PriceHistoryRow[]).map((row) => ({
      date: row.snapshot_date,
      buy: row.median_buy_wl,
      sell: row.median_sell_wl,
    })) || [];

  const allListings = (listings || []) as Listing[];

  const uniqueUserIds = Array.from(
    new Set(allListings.map((listing) => listing.user_id).filter(Boolean))
  );

  let profileMap = new Map<string, ProfileRow>();

  if (uniqueUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, discord_user_id")
      .in("id", uniqueUserIds);

    const profileRows = (profiles || []) as ProfileRow[];
    profileMap = new Map(profileRows.map((profile) => [profile.id, profile]));
  }

  const buyListingIds = allListings
    .filter((listing) => listing.listing_type === "buy")
    .map((listing) => listing.id);

  const commentsByListing = new Map<number, CommentView[]>();

  if (buyListingIds.length > 0) {
    const { data: rawComments } = await supabase
      .from("listing_comments")
      .select("id, listing_id, comment_text, created_at, user_id")
      .in("listing_id", buyListingIds)
      .order("created_at", { ascending: true });

    const comments = (rawComments || []) as RawComment[];

    const commentUserIds = Array.from(new Set(comments.map((comment) => comment.user_id)));

    const commentProfileMap = new Map<
      string,
      { display_name: string | null; avatar_url: string | null }
    >();

    if (commentUserIds.length > 0) {
      const { data: commentProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", commentUserIds);

      for (const profile of commentProfiles || []) {
        commentProfileMap.set(profile.id, {
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        });
      }
    }

    for (const comment of comments) {
      const profile = commentProfileMap.get(comment.user_id);

      const view: CommentView = {
        id: comment.id,
        listing_id: comment.listing_id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        user_display_name: profile?.display_name || null,
        user_avatar_url: profile?.avatar_url || null,
        is_owner: user?.id === comment.user_id,
      };

      if (!commentsByListing.has(comment.listing_id)) {
        commentsByListing.set(comment.listing_id, []);
      }

      commentsByListing.get(comment.listing_id)!.push(view);
    }
  }

  const sortPromotedFirst = (a: Listing, b: Listing) => {
    const aPromoted = isPromotionActive(a);
    const bPromoted = isPromotionActive(b);
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

  const sellDisplay = getRepresentativeLabel(sellListings);
  const buyDisplay = getRepresentativeLabel(buyListings);

  if (itemError || !item) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold">Item not found</h1>
        </div>
      </main>
    );
  }

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
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-black/20">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-14 w-14 object-contain"
                />
              ) : (
                <span className="text-3xl">📦</span>
              )}
            </div>

            <div className="min-w-[240px] flex-1">
              <div className="mb-3 inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                {item.category}
              </div>

              <h1 className="text-4xl font-extrabold text-white">{item.name}</h1>
              <p className="mt-2 text-zinc-200">
                Live market overview, active listings, prices, and comments.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Median Sell</p>
              <p className="mt-2 text-2xl font-extrabold text-white">{sellDisplay}</p>
              <p className="mt-1 text-xs text-zinc-400">WL median: {formatMedianWl(sellMedian)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Median Buy</p>
              <p className="mt-2 text-2xl font-extrabold text-white">{buyDisplay}</p>
              <p className="mt-1 text-xs text-zinc-400">WL median: {formatMedianWl(buyMedian)}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Sell Listings</p>
              <p className="mt-2 text-3xl font-extrabold text-white">{sellListings.length}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Buy Listings</p>
              <p className="mt-2 text-3xl font-extrabold text-white">{buyListings.length}</p>
            </div>
          </div>
        </div>

        <section className="mt-10">
          <ItemPriceChart data={chartData} />
        </section>

        {(listingsError || itemError) && (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Error loading data.
          </p>
        )}

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-2xl font-extrabold text-white">Sell Listings</h2>
            <p className="mt-1 text-sm text-zinc-300">Active sell offers for this item.</p>
          </div>

          {sellListings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-zinc-300">
              No sell listings.
            </div>
          ) : (
            <div className="grid gap-4">
              {sellListings.map((listing) => {
                const isOwnedByUser = user?.id === listing.user_id;
                const isPromoted = isPromotionActive(listing);
                const profile = profileMap.get(listing.user_id);

                return (
                  <ListingCard
                    key={listing.id}
                    listingType={listing.listing_type}
                    quantity={listing.quantity}
                    priceWl={listing.price_wl}
                    priceAmount={listing.price_amount}
                    priceCurrency={listing.price_currency}
                    pricingMode={listing.pricing_mode}
                    stock={listing.stock}
                    worldName={listing.world_name || "Not provided"}
                    ingameName={listing.ingame_name || undefined}
                    discordAvatar={profile?.avatar_url || undefined}
                    discordUserId={profile?.discord_user_id || undefined}
                    displayName={profile?.display_name || undefined}
                    sellerProfileId={listing.user_id}
                    isPromoted={isPromoted}
                    expiresAt={listing.expires_at || new Date().toISOString()}
                  >
                    {isOwnedByUser ? (
                      <PromoteListingButtons
                        listingId={listing.id}
                        promotionPaymentStatus={listing.promotion_payment_status}
                        promotionAssignedWorld={listing.promotion_assigned_world}
                        promotionPaymentRequiredBgl={listing.promotion_payment_required_bgl}
                        promotionRequestedAt={listing.promotion_requested_at}
                      />
                    ) : null}
                  </ListingCard>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-2xl font-extrabold text-white">Buy Listings</h2>
            <p className="mt-1 text-sm text-zinc-300">Active buy requests for this item.</p>
          </div>

          {buyListings.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-zinc-300">
              No buy listings.
            </div>
          ) : (
            <div className="grid gap-4">
              {buyListings.map((listing) => {
                const isOwnedByUser = user?.id === listing.user_id;
                const isPromoted = isPromotionActive(listing);
                const profile = profileMap.get(listing.user_id);
                const comments = commentsByListing.get(listing.id) || [];
                const canUseWorldComment = listing.price_wl <= 20000;

                return (
                  <div key={listing.id}>
                    <ListingCard
                      listingType={listing.listing_type}
                      quantity={listing.quantity}
                      priceWl={listing.price_wl}
                      priceAmount={listing.price_amount}
                      priceCurrency={listing.price_currency}
                      pricingMode={listing.pricing_mode}
                      stock={listing.stock}
                      worldName={listing.world_name || "Not provided"}
                      ingameName={listing.ingame_name || undefined}
                      discordAvatar={profile?.avatar_url || undefined}
                      discordUserId={profile?.discord_user_id || undefined}
                      displayName={profile?.display_name || undefined}
                      sellerProfileId={listing.user_id}
                      isPromoted={isPromoted}
                      expiresAt={listing.expires_at || new Date().toISOString()}
                    >
                      {isOwnedByUser ? (
                        <PromoteListingButtons
                          listingId={listing.id}
                          promotionPaymentStatus={listing.promotion_payment_status}
                          promotionAssignedWorld={listing.promotion_assigned_world}
                          promotionPaymentRequiredBgl={listing.promotion_payment_required_bgl}
                          promotionRequestedAt={listing.promotion_requested_at}
                        />
                      ) : null}
                    </ListingCard>

                    <BuyListingComments
                      listingId={listing.id}
                      comments={comments}
                      canUseWorldComment={canUseWorldComment}
                    />
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