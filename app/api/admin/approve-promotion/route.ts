import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function POST(request: Request) {
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

  const body = await request.json();
  const listingId = Number(body.listingId);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  // ✅ ONLY allow after user confirmed donation
  if (listing.promotion_payment_status !== "pending_verification") {
    return NextResponse.json(
      { error: "Listing is not ready for approval." },
      { status: 400 }
    );
  }

  const promotionExpiresAt = new Date(
    Date.now() + listing.promotion_days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error: updateError } = await supabase
    .from("listings")
    .update({
      is_promoted: true,
      promotion_expires_at: promotionExpiresAt,
      promotion_payment_status: "verified",
    })
    .eq("id", listingId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // free world
  await supabase
    .from("donation_worlds")
    .update({
      is_occupied: false,
      current_listing_id: null,
    })
    .eq("world_name", listing.promotion_assigned_world);

  return NextResponse.json({
    message: "Promotion approved successfully.",
  });
}