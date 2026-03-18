import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

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

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, user_id, assigned_world, promotion_assigned_world")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found or does not belong to you." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

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

    return NextResponse.json({ message: "Listing cancelled successfully." });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}