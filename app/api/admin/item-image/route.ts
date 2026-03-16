import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  const itemId = Number(body.itemId);
  const imageUrl = String(body.imageUrl || "").trim();

  if (!itemId) {
    return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("items")
    .update({ image_url: imageUrl || null })
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}