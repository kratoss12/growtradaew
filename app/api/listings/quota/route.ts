import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";

const FREE_DAILY_LIMIT = 10;

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  // Admin bypass (no limit while developing)
  if (isAdmin) {
    return NextResponse.json({
      limit: "unlimited",
      used: 0,
      remaining: "unlimited",
    });
  }

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
  const remaining = Math.max(0, FREE_DAILY_LIMIT - used);

  return NextResponse.json({
    limit: FREE_DAILY_LIMIT,
    used,
    remaining,
  });
}