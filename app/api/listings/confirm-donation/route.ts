import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const CONFIRMATION_WINDOW_MINUTES = 20;

function isExpired(timestamp: string | null) {
  if (!timestamp) return true;
  const requested = new Date(timestamp).getTime();
  const now = Date.now();
  return now - requested > CONFIRMATION_WINDOW_MINUTES * 60 * 1000;
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

    if (!Number.isInteger(listingId) || listingId <= 0) {
      return NextResponse.json({ error: "Invalid listing ID." }, { status: 400 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found or does not belong to you." },
        { status: 404 }
      );
    }

    // NORMAL HIGH-VALUE LISTING DEPOSIT
    if (listing.payment_status === "awaiting_donation") {
      if (isExpired(listing.created_at)) {
        const worlds = [listing.assigned_world].filter(Boolean);

        await supabase
          .from("listings")
          .delete()
          .eq("id", listingId)
          .eq("user_id", user.id);

        for (const worldName of worlds) {
          await supabase
            .from("donation_worlds")
            .update({
              is_occupied: false,
              current_listing_id: null,
            })
            .eq("world_name", worldName);
        }

        return NextResponse.json(
          {
            error:
              "Confirmation time expired. Your high-value listing was removed because you did not confirm within 20 minutes.",
          },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("listings")
        .update({
          payment_status: "pending_verification",
        })
        .eq("id", listingId)
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message:
          "Donation confirmed. Your high-value listing is now pending admin verification.",
      });
    }

    // PROMOTION DEPOSIT
    if (listing.promotion_payment_status === "awaiting_donation") {
      if (isExpired(listing.promotion_requested_at)) {
        const worlds = [
          listing.assigned_world,
          listing.promotion_assigned_world,
        ].filter(Boolean);

        await supabase
          .from("listings")
          .delete()
          .eq("id", listingId)
          .eq("user_id", user.id);

        for (const worldName of worlds) {
          await supabase
            .from("donation_worlds")
            .update({
              is_occupied: false,
              current_listing_id: null,
            })
            .eq("world_name", worldName);
        }

        return NextResponse.json(
          {
            error:
              "Promotion confirmation time expired. Your listing was removed because you did not confirm within 20 minutes.",
          },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from("listings")
        .update({
          promotion_payment_status: "pending_verification",
        })
        .eq("id", listingId)
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        message:
          "Donation confirmed. Your promotion request is now pending admin verification.",
      });
    }

    return NextResponse.json(
      { error: "This listing is not awaiting donation confirmation." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}