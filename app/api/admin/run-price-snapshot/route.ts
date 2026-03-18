import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

type ListingRow = {
  item_id: number | null;
  listing_type: "buy" | "sell";
  price_wl: number;
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

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("item_id, listing_type, price_wl")
      .eq("status", "approved")
      .eq("listing_category", "item")
      .gt("expires_at", new Date().toISOString());

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 });
    }

    const rows = (listings || []) as ListingRow[];

    const grouped = new Map<
      number,
      {
        buyPrices: number[];
        sellPrices: number[];
      }
    >();

    for (const listing of rows) {
      if (!listing.item_id) continue;

      if (!grouped.has(listing.item_id)) {
        grouped.set(listing.item_id, {
          buyPrices: [],
          sellPrices: [],
        });
      }

      const itemGroup = grouped.get(listing.item_id)!;

      if (listing.listing_type === "buy") {
        itemGroup.buyPrices.push(Number(listing.price_wl));
      } else if (listing.listing_type === "sell") {
        itemGroup.sellPrices.push(Number(listing.price_wl));
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    const snapshotRows = Array.from(grouped.entries()).map(([itemId, group]) => ({
      item_id: itemId,
      snapshot_date: today,
      median_buy_wl: getMedian(group.buyPrices),
      median_sell_wl: getMedian(group.sellPrices),
      buy_listing_count: group.buyPrices.length,
      sell_listing_count: group.sellPrices.length,
    }));

    if (snapshotRows.length === 0) {
      return NextResponse.json({
        message: "No active item listings found. No snapshots were created.",
        snapshotsCreated: 0,
      });
    }

    const { error: upsertError } = await supabase
      .from("item_price_history")
      .upsert(snapshotRows, {
        onConflict: "item_id,snapshot_date",
      });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Price snapshot completed successfully for ${snapshotRows.length} item markets.`,
      snapshotsCreated: snapshotRows.length,
      snapshotDate: today,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}