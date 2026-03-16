import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const NORMAL_LISTING_DURATION_HOURS = 8;

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

  const expiresAt = new Date(
    Date.now() + NORMAL_LISTING_DURATION_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .update({
      status: "approved",
      expires_at: expiresAt,
      payment_status: "verified",
    })
    .eq("id", listingId)
    .select()
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
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

  return NextResponse.json({ message: "Listing approved successfully." });
}