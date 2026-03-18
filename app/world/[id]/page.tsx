import Link from "next/link";
import { createClient } from "../../../utils/supabase/server";

type SellerProfile = {
  display_name: string | null;
  avatar_url: string | null;
  discord_user_id: string | null;
};

function formatWorldPrice(listing: {
  price_amount: number | null;
  price_currency: string | null;
  price_wl: number;
}) {
  if (listing.price_amount && listing.price_currency) {
    return `${listing.price_amount} ${listing.price_currency}`;
  }

  if (listing.price_wl < 1) return `${listing.price_wl.toFixed(4)} WL`;
  if (listing.price_wl % 1 === 0) return `${listing.price_wl} WL`;
  return `${listing.price_wl.toFixed(2)} WL`;
}

export default async function WorldPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: listing } = await supabase
    .from("listings")
    .select(`
      id,
      user_id,
      world_sale_name,
      world_sale_description,
      price_wl,
      price_amount,
      price_currency,
      created_at,
      is_promoted,
      promotion_expires_at,
      ingame_name
    `)
    .eq("id", id)
    .eq("listing_category", "world")
    .eq("status", "approved")
    .maybeSingle();

  if (!listing) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold">World listing not found</h1>
        </div>
      </main>
    );
  }

  let seller: SellerProfile | null = null;

  if (listing.user_id) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, discord_user_id")
      .eq("id", listing.user_id)
      .maybeSingle();

    seller = data;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-950 via-emerald-950 to-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/marketplace?type=worlds"
          className="inline-flex items-center text-sm font-medium text-zinc-300 transition hover:text-white"
        >
          ← Back to World Listings
        </Link>

        <div className="mt-6 rounded-3xl border border-purple-400/20 bg-purple-400/10 p-8 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                Sell World
              </p>
              <h1 className="mt-2 text-4xl font-extrabold text-white">
                {listing.world_sale_name}
              </h1>
              <p className="mt-3 text-sm text-zinc-300">
                Posted on {new Date(listing.created_at).toISOString().slice(0, 10)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Price</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {formatWorldPrice(listing)}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-400">Description</p>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-zinc-100">
              {listing.world_sale_description || "No description."}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                {seller?.avatar_url ? (
                  <img
                    src={seller.avatar_url}
                    alt={seller.display_name || "Seller"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                    {String(seller?.display_name || "T").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400">Seller</p>
                <p className="text-lg font-bold text-white">
                  {seller?.display_name || "Trader"}
                </p>
                <p className="text-sm text-zinc-300">
                  IGN: {listing.ingame_name || "Not provided"}
                </p>
              </div>
            </div>

            <a
              href={seller?.discord_user_id ? `discord://-/users/${seller.discord_user_id}` : "#"}
              className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-400"
            >
              Contact Seller on Discord
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}