import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

function normalizeItemName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatItemName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
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
    const rawName = String(body.name || "");
    const formattedName = formatItemName(rawName);
    const normalizedName = normalizeItemName(rawName);

    if (!normalizedName) {
      return NextResponse.json(
        { error: "Item name is required." },
        { status: 400 }
      );
    }

    if (formattedName.length < 2 || formattedName.length > 60) {
      return NextResponse.json(
        { error: "Item name must be between 2 and 60 characters." },
        { status: 400 }
      );
    }

    const { data: existingItem } = await supabase
      .from("items")
      .select("id, name")
      .ilike("name", formattedName)
      .limit(1)
      .maybeSingle();

    if (existingItem) {
      return NextResponse.json(
        {
          error: `This item already exists as "${existingItem.name}".`,
          existingItemId: existingItem.id,
        },
        { status: 400 }
      );
    }

    const { data: existingPendingRequest } = await supabase
      .from("item_requests")
      .select("id, requested_name, status")
      .eq("normalized_name", normalizedName)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (existingPendingRequest) {
      return NextResponse.json(
        {
          error: `A pending request already exists for "${existingPendingRequest.requested_name}".`,
        },
        { status: 400 }
      );
    }

    const { data: insertedRequest, error: insertError } = await supabase
      .from("item_requests")
      .insert([
        {
          requested_name: formattedName,
          normalized_name: normalizedName,
          requested_by_user_id: user.id,
          status: "pending",
        },
      ])
      .select("id, requested_name")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Item request for "${insertedRequest.requested_name}" was submitted and is waiting for admin review.`,
      requestId: insertedRequest.id,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}