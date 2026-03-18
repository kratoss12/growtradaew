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

  // If it is only a promotion request on an already approved listing,
  // reject the promotion but keep the listing alive.
  if (
    listing.status === "approved" &&
    (listing.promotion_payment_status === "awaiting_donation" ||
      listing.promotion_payment_status === "pending_verification")
  ) {
    const { error: updateError } = await supabase
      .from("listings")
      .update({
        promotion_payment_status: "rejected",
        promotion_assigned_world: null,
        promotion_payment_required_bgl: null,
        promotion_days: null,
        promotion_requested_at: null,
      })
      .eq("id", listingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (listing.promotion_assigned_world) {
      await supabase
        .from("donation_worlds")
        .update({
          is_occupied: false,
          current_listing_id: null,
        })
        .eq("world_name", listing.promotion_assigned_world);
    }

    return NextResponse.json({ message: "Promotion rejected successfully." });
  }

  // Otherwise reject/remove the listing itself.
  if (listing.assigned_world) {
    await supabase
      .from("donation_worlds")
      .update({
        is_occupied: false,
        current_listing_id: null,
      })
      .eq("world_name", listing.assigned_world);
  }

  if (listing.promotion_assigned_world) {
    await supabase
      .from("donation_worlds")
      .update({
        is_occupied: false,
        current_listing_id: null,
      })
      .eq("world_name", listing.promotion_assigned_world);
  }

  const { error: deleteError } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Listing rejected successfully." });
}