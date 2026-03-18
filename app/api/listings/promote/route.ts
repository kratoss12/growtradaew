import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const PROMOTION_PRICES_BGL: Record<number, number> = {
  3: 0.7, // 70 DL
  5: 1,   // 1 BGL
  7: 2,   // 2 BGL
};

function formatPromotionPrice(value: number) {
  if (value === 0.7) return "70 DL";
  if (value === 1) return "1 BGL";
  if (value === 2) return "2 BGL";
  return `${value} BGL`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const listingId = Number(body.listingId);
    const promotionDays = Number(body.promotionDays);

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
    }

    if (![3, 5, 7].includes(promotionDays)) {
      return NextResponse.json(
        { error: "Promotion duration must be 3, 5, or 7 days." },
        { status: 400 }
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found or does not belong to you." },
        { status: 404 }
      );
    }

    if (listing.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved listings can be promoted." },
        { status: 400 }
      );
    }

    if (!listing.expires_at || new Date(listing.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "This listing has expired and cannot be promoted." },
        { status: 400 }
      );
    }

    if (
      listing.promotion_payment_status === "awaiting_donation" ||
      listing.promotion_payment_status === "waiting_donation" ||
      listing.promotion_payment_status === "pending_verification"
    ) {
      return NextResponse.json(
        { error: "This listing already has a promotion payment pending." },
        { status: 400 }
      );
    }

    if (
      listing.is_promoted &&
      listing.promotion_expires_at &&
      new Date(listing.promotion_expires_at) > new Date()
    ) {
      return NextResponse.json(
        { error: "This listing is already actively promoted." },
        { status: 400 }
      );
    }

    const { data: world, error: worldError } = await supabase
      .from("donation_worlds")
      .select("*")
      .eq("is_occupied", false)
      .limit(1)
      .maybeSingle();

    if (worldError || !world) {
      return NextResponse.json(
        { error: "No donation worlds available. Please try again later." },
        { status: 500 }
      );
    }

    const paymentRequiredBgl = PROMOTION_PRICES_BGL[promotionDays];
    const requestedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        promotion_days: promotionDays,
        promotion_payment_required_bgl: paymentRequiredBgl,
        promotion_payment_status: "awaiting_donation",
        promotion_assigned_world: world.world_name,
        promotion_requested_at: requestedAt,
      })
      .eq("id", listingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: occupyError } = await supabase
      .from("donation_worlds")
      .update({
        is_occupied: true,
        current_listing_id: listingId,
      })
      .eq("id", world.id);

    if (occupyError) {
      return NextResponse.json({ error: occupyError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Donate ${formatPromotionPrice(paymentRequiredBgl)} in world ${world.world_name}. After donating, click Confirm Donation below. You have 20 minutes.`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}