import { NextResponse } from "next/server";
import { createClient } from "../../../utils/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { origin, searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(`${origin}?error=discord_login_failed`);
  }

  return NextResponse.redirect(data.url);
}