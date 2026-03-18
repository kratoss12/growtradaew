import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const DAILY_LIMIT = 10;

export async function GET() {
  try {
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

    const isAdmin = profile?.role === "admin";

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfToday.toISOString());

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const used = count || 0;

    if (isAdmin) {
      return NextResponse.json({
        limit: "Unlimited",
        used,
        remaining: "Unlimited",
        isAdmin: true,
      });
    }

    return NextResponse.json({
      limit: DAILY_LIMIT,
      used,
      remaining: Math.max(0, DAILY_LIMIT - used),
      isAdmin: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load quota." },
      { status: 500 }
    );
  }
}