import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const EXPIRY_MINUTES = 20;

export async function POST() {
  const supabase = await createClient();

  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { data: expiredListingDeposits, error: listingFetchError } = await supabase
    .from("listings")
    .select("*")
    .eq("payment_status", "awaiting_donation")
    .lt("created_at", cutoff);

  if (listingFetchError) {
    return NextResponse.json({ error: listingFetchError.message }, { status: 500 });
  }

  const { data: expiredPromotionDeposits, error: promoFetchError } = await supabase
    .from("listings")
    .select("*")
    .eq("promotion_payment_status", "awaiting_donation")
    .lt("promotion_requested_at", cutoff);

  if (promoFetchError) {
    return NextResponse.json({ error: promoFetchError.message }, { status: 500 });
  }

  const allExpired = [...(expiredListingDeposits || []), ...(expiredPromotionDeposits || [])];
  const seen = new Set<number>();

  for (const listing of allExpired) {
    if (seen.has(listing.id)) continue;
    seen.add(listing.id);

    const worlds = [listing.assigned_world, listing.promotion_assigned_world].filter(Boolean);

    for (const worldName of worlds) {
      await supabase
        .from("donation_worlds")
        .update({
          is_occupied: false,
          current_listing_id: null,
        })
        .eq("world_name", worldName);
    }

    await supabase
      .from("listings")
      .delete()
      .eq("id", listing.id);
  }

  return NextResponse.json({
    message: `Cleaned ${seen.size} expired request(s).`,
  });
}