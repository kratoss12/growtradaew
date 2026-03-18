import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";

function normalizeItemName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const requestId = Number(body.requestId);
    const reviewNotes = String(body.reviewNotes || "").trim();

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
    }

    const { data: itemRequest, error: requestError } = await supabase
      .from("item_requests")
      .select("*")
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError || !itemRequest) {
      return NextResponse.json(
        { error: "Pending item request not found." },
        { status: 404 }
      );
    }

    const normalizedName =
      itemRequest.normalized_name ||
      normalizeItemName(itemRequest.requested_name || "");

    const finalReviewNotes = reviewNotes || "Rejected by admin.";

    const { error: rejectRequestError } = await supabase
      .from("item_requests")
      .update({
        status: "rejected",
        review_notes: finalReviewNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (rejectRequestError) {
      return NextResponse.json({ error: rejectRequestError.message }, { status: 500 });
    }

    await supabase
      .from("item_requests")
      .update({
        status: "rejected",
        review_notes: "Rejected through duplicate normalization cleanup.",
        updated_at: new Date().toISOString(),
      })
      .eq("normalized_name", normalizedName)
      .eq("status", "pending")
      .neq("id", requestId);

    const { data: tempItem } = await supabase
      .from("items")
      .select("id, is_official, needs_review")
      .eq("normalized_name", normalizedName)
      .eq("is_official", false)
      .eq("needs_review", true)
      .maybeSingle();

    if (tempItem) {
      const { error: deleteListingsError } = await supabase
        .from("listings")
        .delete()
        .eq("item_id", tempItem.id);

      if (deleteListingsError) {
        return NextResponse.json(
          { error: deleteListingsError.message },
          { status: 500 }
        );
      }

      const { error: deleteItemError } = await supabase
        .from("items")
        .delete()
        .eq("id", tempItem.id);

      if (deleteItemError) {
        return NextResponse.json(
          { error: deleteItemError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      message: `Item request "${itemRequest.requested_name}" was rejected and related temporary marketplace data was removed.`,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}