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
    const category = String(body.category || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    const reviewNotes = String(body.reviewNotes || "").trim();

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Category is required." }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required." }, { status: 400 });
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

    const normalizedName = normalizeItemName(itemRequest.requested_name);

    const { data: existingItemByNormalized } = await supabase
      .from("items")
      .select("id, name")
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    let approvedItemId: number | null = null;

    if (existingItemByNormalized) {
      approvedItemId = existingItemByNormalized.id;

      const { error: updateExistingItemError } = await supabase
        .from("items")
        .update({
          name: itemRequest.requested_name,
          category,
          image_url: imageUrl,
          is_official: true,
          needs_review: false,
        })
        .eq("id", existingItemByNormalized.id);

      if (updateExistingItemError) {
        return NextResponse.json(
          { error: updateExistingItemError.message },
          { status: 500 }
        );
      }
    } else {
      const { data: insertedItem, error: insertItemError } = await supabase
        .from("items")
        .insert([
          {
            name: itemRequest.requested_name,
            normalized_name: normalizedName,
            category,
            image_url: imageUrl,
            is_official: true,
            needs_review: false,
          },
        ])
        .select("id")
        .single();

      if (insertItemError || !insertedItem) {
        return NextResponse.json(
          { error: insertItemError?.message || "Could not create item." },
          { status: 500 }
        );
      }

      approvedItemId = insertedItem.id;
    }

    const { error: updateRequestError } = await supabase
      .from("item_requests")
      .update({
        status: "approved",
        approved_item_id: approvedItemId,
        suggested_category: category,
        suggested_image_url: imageUrl,
        review_notes: reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateRequestError) {
      return NextResponse.json({ error: updateRequestError.message }, { status: 500 });
    }

    await supabase
      .from("item_requests")
      .update({
        status: "approved",
        approved_item_id: approvedItemId,
        review_notes: "Auto-approved through duplicate normalization.",
        updated_at: new Date().toISOString(),
      })
      .eq("normalized_name", normalizedName)
      .eq("status", "pending")
      .neq("id", requestId);

    return NextResponse.json({
      message: `Item "${itemRequest.requested_name}" approved successfully.`,
      approvedItemId,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}